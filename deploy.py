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

priority = {
    'first': [ 'auto-ban-api' ],
    'last': [ ]
}

multi_region_services = []
multi_region_services_additional_regions = {}

never_deploy_re = re.compile(r'^(|\..*|packages.*|.*/\..+|.*__.*)$')

results = {
    "attempt_to_deploy": [],
    "deploy_succeeded": [],
}

current_working_dir = os.getcwd()

results = {
    "attempt_to_deploy": [],
    "deploy_succeeded": [],
}

never_deploy_re = re.compile(r'^(|\..*|packages.*|.*/\..+|.*__.*)$')

def handle_deployment(sls_config, stage, dry_run=True):
    results["attempt_to_deploy"].append(sls_config)
    os.chdir(current_working_dir)
    print(f'\n-------------\nDeploying Service: {sls_config}')
    os.chdir(PurePath(sls_config).parent)

    print(current_working_dir)
    print(sls_config)
    print(PurePath(sls_config).parent)

    regions = ['default']

    if sls_config in multi_region_services:
        print('Hello Multi Region Services: ' + sls_config)
        regions.extend(multi_region_services_additional_regions[sls_config])
    else:
        print('Non multi region service: ' + sls_config)
    
    print('logging regions')
    print(regions)

    final_regions = []

    for region in regions:
        # NOTE: Here if the region is default, we see if it exists in the serverless.yml
        # of this service. Otherwise, use the region provided.
        if region == 'default':
            # NOTE: Our default region is us-east-1
            final_region = 'us-east-1'
            try:
                with open(current_working_dir + '/' + sls_config, 'r') as stream:
                    data_loaded = yaml.load(stream, Loader=yaml.BaseLoader)
            
                final_region = data_loaded['provider']['region']
                print(f'\n-------------\nFound region in serverless config:')
                pprint(region)
            except:
                print(f'\n-------------\nCould not determine region from config, defaulting to us-east-1.')
        else:
            final_region = region

        print('logging final_region')
        print(final_region)
        final_regions.append(final_region)

    print('logging final_regions')
    print(final_regions)

    for final_region in final_regions:
        sls_base = f"{current_working_dir}/node_modules/serverless/bin/serverless.js deploy"
        sls_params = f"-s {stage} -r {final_region}"
        command = ''

        print('\nExecuting:')
        print(f"{sls_base} {command} {sls_params}")

        sys.stdout.flush()
        process = subprocess.Popen(
            f"{sls_base} {command} {sls_params}", shell=True)

        stdoutdata, stderrdata = process.communicate()
        if process.returncode:
            raise Exception(
                f'\n---------\nCommand Failed while deploying {sls_config}!\n---------')

    os.chdir(current_working_dir)
    results["deploy_succeeded"].append(sls_config)


def main(stage, branch, files=None, region='us-east-1', dry_run=True):
    configs = []

    configs_not_deployed_file = f'configs_not_deployed.{branch}.txt'

    try:
        files = files or []
        print('\nNew Files:')
        pprint(files)

        try:
            print('\nLook for previously not deployed')
            with open(configs_not_deployed_file) as f:
                configs_not_deployed = f.readlines()

            if configs_not_deployed:
                configs_not_deployed = [x.strip() for x in configs_not_deployed]
                print('\nPreviously Not Deployed:')
                pprint(configs_not_deployed)

                files += configs_not_deployed
            else:
                print('\nNo failed deployments found in file')
        except FileNotFoundError:
            print('\nNo failed deployments file found')

        finally:
            print('\nFinal all files:')
            pprint(files)

        dirs = list(set([str(PurePath(i).parent) for i in files]))
        pprint(dirs)

        expanded_dirs = list(
            set(chain(*[list(PurePath(i).parents) for i in dirs])))
        expanded_dirs = [str(d) for d in expanded_dirs]
        pprint(expanded_dirs)

        # filter out things that should never be deployed
        filtered_dirs = list(filterfalse(
            never_deploy_re.match, dirs + expanded_dirs))
        pprint(filtered_dirs)

        paths_to_serverless_files = [
            f"{d}/serverless.yml" for d in filtered_dirs]

        configs = list(set(filter(os.path.exists, paths_to_serverless_files)))
        configs.sort()

        print("\nFound following serverless config files")
        pprint(configs)

        print("\nDeploy first services")
        for service in priority.get('first', []):
            config = f"{service}/serverless.yml"
            if config in configs:
                handle_deployment(config, stage)
                configs.remove(config)

        print("\nRemaining configs:")
        pprint(configs)

        print("\nDeploy second services")
        # deploy dynamically, get everything but what is in the last
        for config in configs.copy():
            service = config.rpartition('/')[0]
            if service not in priority.get('last', []):
                handle_deployment(config, stage)
                configs.remove(config)
            else:
                print(config)

        print("\nRemaining configs:")
        pprint(configs)

        print("\nDeploy last services")

        # deploy final services
        for service in priority.get('last', []):
            config = f"{service}/serverless.yml"
            if config in configs:
                handle_deployment(config, stage)
                configs.remove(config)
    except Exception as e:
        raise e
    finally:
        os.chdir(current_working_dir)
        configs += ['hello', 'test']

        with open(configs_not_deployed_file, 'w') as f:
            f.write('\n'.join(configs) + '\n')

        print('\nRemaining configs:')
        pprint(configs)

        output_configs = ', '.join(configs)

        sys.stdout.flush()
        process = subprocess.Popen(
            f'echo "remaining_configs={output_configs}" >> $GITHUB_OUTPUT', shell=True)
        stdoutdata, stderrdata = process.communicate()

        print('\nResults')
        pprint(results)
        print('\n')

        deployed_configs = ', '.join(results.get('deploy_succeeded', []))

        sys.stdout.flush()
        process = subprocess.Popen(
            f'echo "deployed_configs={deployed_configs}" >> $GITHUB_OUTPUT', shell=True)
        stdoutdata, stderrdata = process.communicate()

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
