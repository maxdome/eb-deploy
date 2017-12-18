# EB Deploy

> CLI for AWS Elastic Beanstalk deployments
 
Inspired by [dpl](https://github.com/travis-ci/dpl).

## Install

```sh
$ npm install -g @maxdome/eb-deploy
```

## Usage

```sh
Usage: eb-deploy [options]

CLI for AWS Elastic Beanstalk deployments


Options:

  -V, --version                      output the version number
  -a, --application-name <value>     name of the Elastic Beanstalk Application
  -e, --environment-name <value>     name of the Elastic Beanstalk Environment
  -z, --zip-file [value]             the ZIP file that should be deployed
  -b, --bucket <value>               name of the S3 bucket to upload the ZIP file to
  -P, --bucket-path [value]          target location of the ZIP file within the S3 bucket
  -l, --version-label [value]        version label of the new app version
  -d, --version-description [value]  description of the new app version
  --wait-until-deployed              wait until the app is deployed
  --only-create-app-version          only create a new app version without actually deploying it
  --use-existing-app-version         use an existing app version if the version with the label already exists
  --skip-cleanup                     skips the cleanup after the deploy
  --access-key-id [value]            AWS Access Key ID
  --secret-access-key [value]        AWS Secret Access Key
  --session-token [value]            AWS Session Token
  --region [value]                   AWS region of the Elastic Beanstalk application
  -h, --help                         output usage information
```
