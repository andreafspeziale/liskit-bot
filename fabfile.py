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
def run_su(command, user="root"):
    return run('su %s -c "%s"' % (user, command))

def make_deploy(isRoot):
    if(isRoot):
        run('cd '+parser.get('deploy_config', 'path'))
        run('git pull')
    else:
        run_su('cd '+parser.get('deploy_config', 'path'))
        run_su('git pull')