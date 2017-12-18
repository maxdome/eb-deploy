const program = require('commander');

const pkg = require('../package.json');
const EBDeploy = require('./EBDeploy');

class CLI {
  static run (argv) {
    program
      .version(pkg.version)
      .description(pkg.description)
      .option('-a, --application-name <value>', 'Name of the Elastic Beanstalk Application')
      .option('-e, --environment-name <value>', 'Name of the Elastic Beanstalk Environment')
      .option('-z, --zip-file [value]', 'The ZIP file that should be deployed')
      .option('-b, --bucket <value>', 'Name of the S3 bucket to upload the ZIP file to')
      .option('-P, --bucket-path [value]', 'Target location of the ZIP file within the S3 bucket')
      .option('-l, --version-label [value]', 'Version label of the new app version')
      .option('-d, --version-description [value]', 'Description of the new app version')
      .option('--wait-until-deployed', 'Wait until the app is deployed')
      .option('--only-create-app-version', 'Only create a new app version without actually deploying it')
      .option('--use-existing-app-version', 'Use an existing app version if the version with the label already exists')
      .option('--access-key-id [value]', 'AWS Access Key ID')
      .option('--secret-access-key [value]', 'AWS Secret Access Key')
      .option('--session-token [value]', 'AWS Session Token')
      .option('--region [value]', 'AWS Region of the Elastic Beanstalk Application')
      .parse(argv);

    if (!process.argv.slice(2).length) {
      program.help();
    }

    this.ebDeploy = new EBDeploy(program);
    this.ebDeploy.deploy();
  }
}

module.exports = CLI;
