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

$tw.UpdateTimes = $tw.UpdateTimes || {};

if (fs) {
  fs.watch($tw.boot.wikiTiddlersPath, function (eventType, filename) {
    // Update the list of tiddlers currently in the browser
    $tw.connections[0].send(JSON.stringify({type: 'listTiddlers'}));
    // Make sure that the file name isn't undefined
    if (filename) {
      // Load tiddler data from the file
      var tiddlerObject = $tw.loadTiddlersFromFile(`${$tw.boot.wikiTiddlersPath}/${filename}`);
      // Get edited time
      var editedTime = fs.statSync(`${$tw.boot.wikiTiddlersPath}/${filename}`).mtime.getTime();

      // Check if the tiddler is currently in the browser store
      var tiddlerExistsInBrowser = $tw.BrowserTiddlerList.indexOf(tiddlerObject.tiddlers[0].title) !== -1;

      // If the tiddler exists in the browser check if the last time it was
      // updated from here is older than the time listed in the tiddler file,
      // if so update it.
      var currentTimeStamp = Date.now();
      if (!$tw.UpdateTimes[tiddlerObject.tiddlers[0].title]) {
        $tw.UpdateTimes[tiddlerObject.tiddlers[0].title] = 0;
      }

      if (!tiddlerExistsInBrowser) {

        tiddlerObject.tiddlers[0].gatekeeper_update_time = editedTime;
        //$tw.UpdateTimes[tiddlerObject.tiddlers[0].title] = editedTime;

        $tw.connections[0].send(JSON.stringify({type: 'makeTiddler', fields: tiddlerObject.tiddlers[0]}));
      } else if (tiddlerObject.tiddlers[0].title) {
        /*
          TODO add logic here to check if the changes to an existing file
          should be pushed to the browser or not.
          Also figrue out how to do this.
        */
        console.log(tiddlerObject.tiddlers[0].gatekeeper_update_time)
        console.log(editedTime)
        if (Number(tiddlerObject.tiddlers[0].gatekeeper_update_time) + 5000 < editedTime || !tiddlerObject.tiddlers[0].gatekeeper_update_time) {

          tiddlerObject.tiddlers[0].gatekeeper_update_time = editedTime;

          console.log('4')
          console.log(tiddlerObject.tiddlers[0])

          $tw.connections[0].send(JSON.stringify({type: 'makeTiddler', fields: tiddlerObject.tiddlers[0]}));
        }
      }
      // Check if the tiddler is listed in the tiddlers currently in the browser

    } else {
      console.log('No filename given!');
    }
  });
}

})();
