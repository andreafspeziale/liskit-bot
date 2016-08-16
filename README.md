#Liskit Bot
Creating a simple telegram bot using a raspberry and telepot in python. Checking the service and machine status with
  
    - /ping
    - /live

## Prereq
    - telegram (https://telegram.org/)
    - python
    - pip
    - virtualenv
    
## Creating a bot
You will need to create a bot with telegram BotFather.
On Telegram, open the @BotFather profile, and start to talk with “him”. 

The BotFather will ask you to read a manual, the first thing you’ll have to do is to create a brand new bot. 
Type the command “/newbot” and follow the instruction.

It will return an api key and you have to put it in the example.config.ini file renaming it in config.ini.

## Run
    
    - clone the repo
    - inside create a virtualenv like this: virtualenv envLiskit
    - activate it with source /envLiskit/bin/activate
    - pip install telepot
    
Run the script

    - python liskit.py
    
## ToDo

    fabfile