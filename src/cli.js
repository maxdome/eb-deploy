const program = require('commander');

const pkg = require('../package.json');
const EBDeploy = require('./EBDeploy');

class CLI {
  static run (argv) {
    program
      .version(pkg.version)
      .description(pkg.description)
      .option('-a, --application-name <value>', 'name of the Elastic Beanstalk application')
      .option('-e, --environment-name <value>', 'name of the Elastic Beanstalk environment')
      .option('-z, --zip-file [value]', 'the ZIP file that should be deployed')
      .option('-b, --bucket [value]', 'name of the S3 bucket to upload the ZIP file to')
      .option('-p, --bucket-path [value]', 'target location of the ZIP file within the S3 bucket')
      .option('-l, --version-label [value]', 'version label of the new app version')
      .option('-d, --version-description [value]', 'description of the new app version')
      .option('--no-wait-until-deployed', 'do not wait until the app is deployed')
      .option('--only-create-app-version', 'only create a new app version without actually deploying it')
      .option('--ignore-existing-app-version', 'do not deploy an existing app version if the version with the label already exists')
      .option('--skip-cleanup', 'skips the cleanup after the deploy')
      .option('--access-key-id [value]', 'AWS Access Key ID')
      .option('--secret-access-key [value]', 'AWS Secret Access Key')
      .option('--session-token [value]', 'AWS Session Token')
      .option('--region [value]', 'AWS region of the Elastic Beanstalk application')
      .parse(argv);

    if (!argv.slice(2).length) {
      program.help();
    }

    this.ebDeploy = new EBDeploy(program);
    this.ebDeploy.deploy();
  }
}

module.exports = CLI;
