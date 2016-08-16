import telepot
import time
import requests
import json

from ConfigParser import SafeConfigParser

parser = SafeConfigParser()
parser.read('config.ini')

def handle(msg):
    chat_id = msg['chat']['id']
    command = msg['text']

    print 'Got command: %s' % command

    if command == '/ping':
        bot.sendMessage(chat_id, 'pong :D')
    if command == '/live':
        r = json.dumps((requests.get(parser.get('machine_config', 'url'))).json(), indent=4)
        bot.sendMessage(chat_id, r)

bot = telepot.Bot(parser.get('telegram_config', 'bot_api_key'))
bot.message_loop(handle)

print 'I am listening ...'

while 1:
    time.sleep(10)