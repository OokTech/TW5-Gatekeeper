/*\
title: $:/plugins/OokTech/Gatekeeper/Gatekeeper.js
type: application/javascript
module-type: startup

This module watches the file system in the tiddlers folder and any changes to
the files in the folder that don't come from the browser are reported to the
browser. So if you make a new .tid file in the tiddlers folder it will appear
in the wiki in the browser without needing to restart the server. You can also
delete files to remove the tiddlers from the browser.

Note: For now this only watches the tiddlers folder that is in the same place
as the tiddlywiki.info file and doesn't watch for changes in any subfolders
inside that folder.
This is due to differences in how different operating systems handle watching
for changes to files.

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

// require the fs module if we are running node
var fs = $tw.node ? require("fs"): undefined;
var path = $tw.node ? require("path"): undefined;

$tw.GateKeeper = $tw.GateKeeper || {};
$tw.UpdateTimes = $tw.UpdateTimes || {};
$tw.BrowserTiddlerList = $tw.BrowserTiddlerList || {};

/*
  TODO
  create a list of excluded tiddlers. At a minimum it should have
  $:/StoryList
  It would be best if we can have it set inside the wiki.
  A per-wiki exclude list would be best but that would have annoying
  logic.
*/
$tw.GateKeeper.ExcludeList = $tw.GateKeeper.ExcludeList || ['$:/StoryList'];

/*
  This is a convenience function that takes a javascript date object and
  returns a tiddlywiki compatible timestamp.
*/
var makeTiddlyWikiTime = function (date) {
  return Number(date.getFullYear() + $tw.utils.pad(date.getMonth()+1) + $tw.utils.pad(date.getDate()) + $tw.utils.pad(date.getHours()) + $tw.utils.pad(date.getMinutes()) + $tw.utils.pad(date.getSeconds()) + String(date.getMilliseconds()).slice(-3));
}

if (fs) {
  fs.watch($tw.boot.wikiTiddlersPath, function (eventType, filename) {
    // Make sure that the file name isn't undefined
    if (filename && filename.slice(0,10) !== "Draft of '") {
      // Load tiddler data from the file
      var tiddlerObject = $tw.loadTiddlersFromFile(`${$tw.boot.wikiTiddlersPath}/${filename}`);
      // Get when the file was last modified in tiddlywiki format
      var editedTime = makeTiddlyWikiTime( fs.statSync(`${$tw.boot.wikiTiddlersPath}/${filename}`).mtime);
      // Don't update tiddlers on the exclude list
      if (tiddlerObject.tiddlers[0].title && $tw.GateKeeper.ExcludeList.indexOf(tiddlerObject.tiddlers[0].title) === -1 && !tiddlerObject.tiddlers[0]['draft.of']) {
        // If there isn't currently information about the tiddler and file saved,
        // create a placeholder for it.
        if (!$tw.UpdateTimes[tiddlerObject.tiddlers[0].title]) {
          $tw.UpdateTimes[tiddlerObject.tiddlers[0].title] = {gatekeeper_update_time: tiddlerObject.tiddlers[0].gatekeeper_update_time, modified: tiddlerObject.tiddlers[0].modified, modifier: tiddlerObject.tiddlers[0].modifier, waiting: {}};
        }

        // Update the list of tiddlers currently in the browser
        $tw.connections.forEach(function (connection, index, connections) {
          // Get the list of browser tiddlers for the current connection
          connection.socket.send(JSON.stringify({type: 'listTiddlers'}));
          // If the tiddler isn't currently in the browser for this connection, // than we send it to the brwoser.
          if ($tw.BrowserTiddlerList[index].indexOf(tiddlerObject.tiddlers[0].title) === -1) {
            // Set the gatekeeper_update_time field of the tiddler
            tiddlerObject.tiddlers[0].gatekeeper_update_time = editedTime;
            // Save the gatekeeper_update_time for the local data
            $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].gatekeeper_update_time = editedTime;
            // Set the tiddler as waiting for a response
            $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[index] = true;
            // Send the makeTiddler command to the browser with the tiddler
            // information.
            connection.socket.send(JSON.stringify({type: 'makeTiddler', fields: tiddlerObject.tiddlers[0]}));
          }

          if (tiddlerObject.tiddlers[0].title && !$tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[index]) {
            // Only do this if we have at least a tiddler title or else it won't
            // work. This is just a quick check for data sanitisation.
            /*
              Setup:
              We push changes to a tiddler to the browser, save the gatekeeper_update_time for the tiddler and wait to see a change
              to the file. The first time the file changes after we push it we
              capture the modified field and save it but don't push because it is the browser saving the changes we just pushed.

              Reasons to push:
              If the file changes but the modified field doesn't change we push to
              everyone because the change came from outside tiddlywiki.
            */
            // First check is if the modified field is different
            if (tiddlerObject.tiddlers[0].modified !== $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].modified) {
              // CASE: tiddler modified by a person from within tiddlywiki
              // ACTION: Push to everyone but the modifier

              // Update the gatekeeper_update_time
              tiddlerObject.tiddlers[0].gatekeeper_update_time = editedTime;
              // Set the local gatekeeper_update_time
              $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].gatekeeper_update_time = editedTime;
              $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].modified = tiddlerObject.tiddlers[0].modified;

              /*
                TODO make this send to everyone but the modifier
              */
              $tw.connections.forEach(function (innerConnection, innerIndex, connections) {
                if (!$tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[innerIndex]) {
                  connection.socket.send(JSON.stringify({type: 'makeTiddler', fields: tiddlerObject.tiddlers[0]}));
                  $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[innerIndex] = true;
                }
              });
            } else if (Number(tiddlerObject.tiddlers[0].gatekeeper_update_time) < editedTime || !tiddlerObject.tiddlers[0].gatekeeper_update_time) {
              // CASE: tiddler file modified from outside the wiki
              // ACTION: Check if it has been long enough since the last
              // update, if so push to everyone.

              // Update the gatekeeper_update_time
              tiddlerObject.tiddlers[0].gatekeeper_update_time = editedTime;
              // Set the local waiting status to true
              $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[index] = true;
              // Set the local gatekeeper_update_time
              $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].gatekeeper_update_time = editedTime;
              // Send the command and tiddler info to the browser for all
              // connected browsers.
              connection.socket.send(JSON.stringify({type: 'makeTiddler', fields: tiddlerObject.tiddlers[0]}));
            }
          } else if ($tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[index]) {
            // If we are waiting for the browser to write back the updated
            // tiddler set the waiting value for that tiddler to false.
            $tw.UpdateTimes[tiddlerObject.tiddlers[0].title].waiting[index] = false;
          }
        });
      }
    } else {
      console.log('No filename given!');
    }
  });
}

})();
