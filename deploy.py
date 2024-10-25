#!/usr/bin/python3

import os
import re
import sys
import argparse
import subprocess
import yaml
from itertools import chain, filterfalse
from pprint import pprint
from pathlib import PurePath

never_deploy_re = re.compile(r'^(|\..*|packages.*|.*/\..+|.*__.*)$')

results = {
    "attempt_to_deploy": [],
    "deploy_succeeded": [],
}

current_working_dir = os.getcwd()


def handle_deployment(stage, dry_run=True):

    print(f'\n-------------\nDeploying!!')

    try:
        with open(current_working_dir + '/serverless.yml', 'r') as stream:
            data_loaded = yaml.load(stream, Loader=yaml.BaseLoader)
    
        region = data_loaded['provider']['region']
        print(f'\n-------------\nFound region in serverless config:')
        pprint(region)
    except:
        region = 'us-east-1'
        print(f'\n-------------\nCould not determine region from config, defaulting to us-east-1.')

    sls_base = f"{current_working_dir}/node_modules/serverless/bin/serverless.js deploy"
    sls_params = f"-s {stage} -r {region}"
    command = ''

    print('\nExecuting:')

    sys.stdout.flush()
    process = subprocess.Popen(
        f"{sls_base} {command} {sls_params}", shell=True)
    stdoutdata, stderrdata = process.communicate()
    if process.returncode:
        raise Exception(
            f'\n---------\nCommand Failed while deploying!\n---------')

    os.chdir(current_working_dir)


def main(stage, branch, files=None, region='us-east-1', dry_run=True):
    try:
        handle_deployment(stage)
    except Exception as e:
        raise e
    finally:
        print('complete!')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs='*',
                        help="Changed files")
    parser.add_argument("-r", "--region", default="us-east-1",
                        help="AWS region to run this against")
    parser.add_argument("-b", "--branch", required=True,
                        help="Git branch to run against",
                        choices=['prod', 'main',
                                 'refs/heads/main', 'refs/heads/prod']
                        )
    args = vars(parser.parse_args())
    print(args)
    stage = args.get('branch', '').split('/')[-1]
    print(stage)
    if stage == 'main':
        stage = 'dev'

    args['stage'] = stage
    print('Parsed Args:')
    pprint(args)
    main(**args)
