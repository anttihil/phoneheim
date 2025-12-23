# Task
Write a web app for Phoneheim. Phoneheim is a free app to help tracking the game state of a miniatures wargame, Mordheim, and to act as a rules reference.

# Requirements
1) Warband creation tool
- follow the warband tables to allow the player to create a warband
- the created warband should be saved to the indexeddb
2) Play a game -- warband selection and scenario selection/randomization
- load warband from browser indexeddb or create a new warband
3) Play a game -- the board setup
- instruct the players how to setup the scenario and terrain on the board 
4) Play a game -- the main loop:
- a wizard-like progression that steps through the game phases
- save warband state into the browser indexeddb (in-memory also during play)
- the wizard stops to ask for an input of player action, like "choose which miniature to act with: {list}", then the player executes "move miniature 'Gorlob the chaos marauder' {ID}" or "try to charge 'Neinelis the elven mercenary' with my 'Hobba the halfling'". 
- after player input, the game asks the player to throw virtual dice, when appropriate, and then resolve the rules mechanics
- after rules resolution, the game prints the outcome of the action and record the state changes
5) Scenario aftermath resolution
- after the scenario is over, the game should let the players roll through the random event tables, such as checking for what happens to wounded characters and how players want to allocate loot.

# Plan
Execute this plan step-by-step.
1) Extract gameplay logic and data from the .txt files. Write the game logic requirements into suitable files.
2) Based on your understanding of the game rules, expand the above requirements into more specific feature requirements. Write those requirements into a file. 
3) TDD Loop: write a Playwright UI code to match a single feature requirement, then write the actual code that passes the test. 

# Tech features and stack
1) No server, only in browser.
1) separate game logic from the UI
2) write this in HTML, CSS and JS
3) enable WebRTC communication so that players taking part in the game can scan a QR code to join the game (instead of relying on a signaling server)
4) allow collaborative play so allow phones/web users in the WebRTC session will record the game state and wargame state => allow users to play from their own phones
5) minimize external dependencies 

*IMPORTANT* Use the Chromium browser to test the web app. To test WebRTC, you can use two browser instances or tabs. 
