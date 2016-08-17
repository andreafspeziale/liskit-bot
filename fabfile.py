from __future__ import with_statement
from fabric.api import *
from ConfigParser import SafeConfigParser

parser = SafeConfigParser()
parser.read('config.ini')

@hosts(parser.get('deploy_config', 'host_user')+'@'+parser.get('deploy_config', 'host_ip')+':'+parser.get('deploy_config', 'host_port'))
def update_production():
    # ssh user has all the permission to run the following command
    if parser.get('deploy_config', 'user') == '':
        make_deploy(True)
    else:
        # ssh user HAS NOT the permission to run the following command, so change user and run
        make_deploy(False)

# workaround for fabric sudo issue
def run_su(command, user=parser.get('deploy_config', 'user')):
    return run('su %s -c "%s"' % (user, command))

def make_deploy(isRoot):
    if(isRoot):
        run('git -C '+parser.get('deploy_config', 'path')+' pull')
    else:
        run_su('git -C '+parser.get('deploy_config', 'path')+' pull')