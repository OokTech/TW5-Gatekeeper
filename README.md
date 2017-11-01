# TiddlyWiki Gakekeeper

This needs a better name.

First, this requires the node version of tiddlywiki.

This also requires some additional npm modules, namely ws (for websockets)
and ip (used to get the ip address of the websocket server).

To install these two modules navigate to the folder where you have tiddlywiki
installed and use the following commands:

`npm install ws`

`npm install ip`

You also need to have the TiddlyWebSockets plugin installed (https://github.com/OokTech/TW5-TiddlyWebSockets)

To use the demo:

In the editions subfolder where you have tiddlywiki installed create a folder called GatekeeperDemo.
Copy the tiddlywiki.info file from the TestWiki folder in the repo into the GatekeeperDemo folder on your computer.

In the plugins subfolder create a folder called OokTech and in that folder place the TiddlyWebSockets plugin folder and the GateKeeper plugin folder.

To start the server navigate to where you have tiddlywiki installed and type:

`node ./tiddlywiki.js editions/GatekeeperDemo/ --server 8080 $:/core/save/lazy-images text/plain text/html "" "" 0.0.0.0`

It will give you the ip address of the server, in any browser on a computer on the local network put that ip address in address bar and it should open the wiki.
Now if you edit any .tid files outside of the wiki the changes should immediately be reflected in the wiki, if you have multiple browsers connected to the server open up the same tiddler in each browser, when you edit the tiddler in one browser than the edit button in the other browser should be replaced by an X and if you edit the tiddler than the edits should appear in the other browser.

These changes take a few seconds to appear. I am working on a new syncadapter that will make the changes propagate much faster.
