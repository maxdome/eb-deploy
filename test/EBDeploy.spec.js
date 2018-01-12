/* eslint-env mocha */
/* eslint no-unused-expressions: 0 */

const chai = require('chai');
const sinon = require('sinon');
const AWS = require('aws-sdk');
const mock = require('mock-require');

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
const expect = chai.expect;

let EBDeploy = require('../src/EBDeploy');

describe('EBDeploy', () => {
  const sandbox = sinon.sandbox.create();

  describe('constructor (options)', () => {
    beforeEach(() => {
      sandbox.stub(AWS.config, 'update');
    });

    it('sets options', () => {
      const options = {
        applicationName: 'TestApplication',
        environmentName: 'TestEnvironment'
      };
      const ebDeploy = new EBDeploy(options);

      expect(ebDeploy.options).to.include(options);
    });

    it('calls AWS.config.update() with default region (eu-central-1)', () => {
      const ebDeploy = new EBDeploy(); // eslint-disable-line no-unused-vars
      expect(AWS.config.update).to.have.been.calledWith({ region: 'eu-central-1' });
    });

    it('calls AWS.config.update() with specified region', () => {
      const ebDeploy = new EBDeploy({ region: 'us-east-1' }); // eslint-disable-line no-unused-vars
      expect(AWS.config.update).to.have.been.calledWith({ region: 'us-east-1' });
    });

    it('created AWS credentials with accessKeyId and secretAccesKey', () => {
      sandbox.spy(AWS, 'Credentials');
      const credentials = {
        accessKeyId: 'testAccessKey',
        secretAccessKey: 'testSecretAccessKey'
      };
      const ebDeploy = new EBDeploy(credentials); // eslint-disable-line no-unused-vars
      expect(AWS.Credentials).to.have.been.calledWithNew;
      expect(AWS.Credentials).to.have.been.calledWithExactly(...Object.values(credentials), undefined);
    });

    it('created AWS credentials with accessKeyId, secretAccesKey & sessionToken', () => {
      sandbox.spy(AWS, 'Credentials');
      const credentials = {
        accessKeyId: 'testAccessKey',
        secretAccessKey: 'testSecretAccessKey',
        sessionToken: 'testSessionToken'
      };
      const ebDeploy = new EBDeploy(credentials); // eslint-disable-line no-unused-vars
      expect(AWS.Credentials).to.have.been.calledWithNew;
      expect(AWS.Credentials).to.have.been.calledWithExactly(...Object.values(credentials));
    });

    it('creates an instance of AWS.S3', () => {
      const ebDeploy = new EBDeploy();
      expect(ebDeploy.s3).to.be.instanceof(AWS.S3);
    });

    it('creates an instance of AWS.ElasticBeanstalk', () => {
      const ebDeploy = new EBDeploy();
      expect(ebDeploy.eb).to.be.instanceof(AWS.ElasticBeanstalk);
    });
  });

  describe('deploy ()', () => {
    let ebDeploy;

    const options = {
      applicationName: 'testApplicationName',
      environmentName: 'testEnvironmentName',
      versionLabel: 'v0.0.0-test'
    };

    beforeEach(() => {
      ebDeploy = new EBDeploy(Object.assign({}, options));
      sandbox.stub(console, 'info');
      sandbox.stub(ebDeploy, 'appVersionExists');
      sandbox.stub(ebDeploy, 'createOrGetStorageLocation');
      sandbox.stub(ebDeploy, 'bucketExists');
      sandbox.stub(ebDeploy, 'createBucket');
      sandbox.stub(ebDeploy, 'createZip');
      sandbox.stub(ebDeploy, 'upload');
      sandbox.stub(ebDeploy, 'createAppVersion');
      sandbox.stub(ebDeploy, 'updateEnvironment');
      sandbox.stub(ebDeploy, 'waitUntilDeployed');
      sandbox.stub(ebDeploy, 'cleanup');
    });

    it('sets start time', async () => {
      await ebDeploy.deploy();
      expect(ebDeploy.startTime).to.be.instanceof(Date);
    });

    it('calls eb.appVersionExists if useExistingAppVersion is set', async () => {
      ebDeploy.options.useExistingAppVersion = true;
      await ebDeploy.deploy();
      expect(ebDeploy.appVersionExists).to.have.been.called;
    });

    it('calls eb.updateEnvironment with versionLabel if app version already exists', async () => {
      ebDeploy.options.useExistingAppVersion = true;
      ebDeploy.appVersionExists.returns(true);
      await ebDeploy.deploy();
      expect(ebDeploy.updateEnvironment).to.have.been.calledWith(options.versionLabel);
    });

    it('calls eb.bucketExists if bucket was defined in options', async () => {
      ebDeploy.options.bucket = 'testBucket';
      await ebDeploy.deploy();
      expect(ebDeploy.bucketExists).to.have.been.called;
    });

    it('calls eb.createBucket if bucket is defined in options and does not exists yet', async () => {
      ebDeploy.options.bucket = 'testBucket';
      ebDeploy.bucketExists.returns(false);
      await ebDeploy.deploy();
      expect(ebDeploy.createBucket).to.have.been.called;
    });

    it('does not call eb.createBucket if bucket exists', async () => {
      ebDeploy.options.bucket = 'testBucket';
      ebDeploy.bucketExists.returns(true);
      await ebDeploy.deploy();
      expect(ebDeploy.createBucket).to.not.have.been.called;
    });

    it('calls eb.createZip if no zipFile was defined', async () => {
      await ebDeploy.deploy();
      expect(ebDeploy.createZip).to.have.been.called;
    });

    it('does not call eb.createZip if a zipFile was defined', async () => {
      ebDeploy.options.zipFile = 'testZipFile.zip';
      await ebDeploy.deploy();
      expect(ebDeploy.createZip).to.not.have.been.called;
    });

    it('calls eb.upload with archiveName and zipFile', async () => {
      const zipFile = 'testZipFile.zip';
      ebDeploy.createZip.returns(zipFile);
      await ebDeploy.deploy();
      expect(ebDeploy.upload).to.have.been.calledWith(options.versionLabel + '.zip', zipFile);
    });

    it('calls eb.createAppVersion with S3 key', async () => {
      const s3Key = 'testS3Key.zip';
      ebDeploy.upload.returns(s3Key);
      await ebDeploy.deploy();
      expect(ebDeploy.createAppVersion).to.have.been.calledWith(s3Key);
    });

    it('does not call eb.updateEnvironment if onlyCreateAppVersion option is set', async () => {
      ebDeploy.options.onlyCreateAppVersion = true;
      await ebDeploy.deploy();
      expect(ebDeploy.updateEnvironment).to.not.have.been.called;
    });

    it('calls eb.updateEnvironment with version', async () => {
      const version = 'testVersion';
      ebDeploy.createAppVersion.returns(version);
      await ebDeploy.deploy();
      expect(ebDeploy.updateEnvironment).to.have.been.calledWith(version);
    });

    it('calls eb.waitUntilDeploy if waitUntilDeployed option is set', async () => {
      ebDeploy.options.waitUntilDeployed = true;
      await ebDeploy.deploy();
      expect(ebDeploy.waitUntilDeployed).to.have.been.called;
    });

    it('calls eb.cleanup', async () => {
      await ebDeploy.deploy();
      expect(ebDeploy.cleanup).to.have.been.called;
    });

    it('calls process.exit on error', async () => {
      ebDeploy.cleanup.throws('Test error');
      sandbox.stub(console, 'error');
      sandbox.stub(process, 'exit');
      await ebDeploy.deploy();
      expect(process.exit).to.have.been.calledWith(1);
    });
  });

  describe('appVersionExists ()', () => {
    let ebDeploy;
    let response;

    const options = {
      applicationName: 'testApplicationName',
      versionLabel: 'v0.0.0-test'
    };

    beforeEach(() => {
      ebDeploy = new EBDeploy(Object.assign({}, options));
      response = {
        ResponseMetadata: { RequestId: 'testRequestId' },
        ApplicationVersions: []
      };
      sandbox.stub(ebDeploy.eb, 'describeApplicationVersions').returns({ promise: () => Promise.resolve(response) });
    });

    it('calls eb.desribeApplicationVersion with ApplicationName and VersionLabels', async () => {
      await ebDeploy.appVersionExists();
      expect(ebDeploy.eb.describeApplicationVersions).to.have.been.calledWith({
        ApplicationName: options.applicationName,
        VersionLabels: [ options.versionLabel ]
      });
    });

    it('returns false if eb.desribeApplicationVersion request returns an empty array', async () => {
      const result = await ebDeploy.appVersionExists();
      expect(result).to.be.false;
    });

    it('returns false if eb.desribeApplicationVersion request returns an non-empty array', async () => {
      response.ApplicationVersions.push(options.versionLabel);
      const result = await ebDeploy.appVersionExists();
      expect(result).to.be.true;
    });

    it('throws an error if response from eb.desribeApplicationVersion is not as expected', async () => {
      response = { UnknownResponse: 'unknown' };
      return expect(ebDeploy.appVersionExists()).to.be.rejected;
    });
  });

  describe('createOrGetStorageLocation ()', () => {
    const S3Bucket = 'testBucket';
    let ebDeploy;

    beforeEach(() => {
      ebDeploy = new EBDeploy();
      sandbox.stub(ebDeploy.eb, 'createStorageLocation').returns({ promise: () => Promise.resolve({ S3Bucket }) });
    });

    it('calls eb.createStorageLocation', async () => {
      await ebDeploy.createOrGetStorageLocation();
      expect(ebDeploy.eb.createStorageLocation).to.have.been.calledOnce;
    });

    it('returns S3 bucket name', async () => {
      const result = await ebDeploy.createOrGetStorageLocation();
      expect(result).to.equal(S3Bucket);
    });
  });

  describe('bucketExists (bucket)', () => {
    let ebDeploy;
    const bucket = '36195286554965740635-testbucket';

    beforeEach(() => {
      ebDeploy = new EBDeploy();
      ebDeploy.bucket = bucket;
      sandbox.stub(ebDeploy.s3, 'headBucket').returns({ promise: () => Promise.resolve() });
    });

    it('calls s3.headBucket with Bucket property', async () => {
      await ebDeploy.bucketExists(bucket);
      expect(ebDeploy.s3.headBucket).to.have.been.calledWith({
        Bucket: bucket
      });
    });

    it('returns true if s3.headBucket request was successful', async () => {
      const result = await ebDeploy.bucketExists(bucket);
      expect(result).to.be.true;
    });

    it('returns false if s3.headBucket request returns a `NotFound` error', async () => {
      const error = new Error();
      error.code = 'NotFound';
      ebDeploy.s3.headBucket.throws(error);

      const result = await ebDeploy.bucketExists(bucket);
      expect(result).to.be.false;
    });

    it('throws an error if s3.headBucket request returns any other error than `NotFound`', () => {
      const error = new Error();
      error.code = 'Forbidden';
      ebDeploy.s3.headBucket.throws(error);

      return expect(ebDeploy.bucketExists(bucket)).to.eventually.be.rejectedWith(error);
    });
  });

  describe('createBucket (bucket)', () => {
    let ebDeploy;
    const bucket = '36195286554965740635-testbucket';

    beforeEach(() => {
      ebDeploy = new EBDeploy({ bucket });
      sandbox.stub(ebDeploy.s3, 'createBucket').returns({ promise: () => Promise.resolve() });
    });

    it('returns a promise', () => {
      expect(ebDeploy.createBucket(bucket)).to.be.a('promise');
    });

    it('calls s3.createBucket with Bucket parameter', () => {
      return ebDeploy.createBucket(bucket).then(() => {
        expect(ebDeploy.s3.createBucket).to.have.been.calledWith({
          Bucket: bucket
        });
      });
    });
  });

  describe('createZip ()', () => {
    let ebDeploy;
    let shStub = sandbox.stub().returns('');
    const versionLabel = 'v1.0.0-test';

    beforeEach(() => {
      mock('shell-tag', shStub);
      EBDeploy = mock.reRequire('../src/EBDeploy');
      ebDeploy = new EBDeploy({ versionLabel });
    });

    it('executes `git archive` shell command', () => {
      ebDeploy.createZip();
      expect(shStub).to.have.been.calledWith(['git archive -o ', ' --format=zip HEAD']);
    });

    it('returns a path string', () => {
      expect(ebDeploy.createZip()).to.be.a('string');
    });
  });

  describe('upload (archiveName, file)', () => {
    const mockFileBody = 'FILEBODY';
    const archiveName = 'testArchive.zip';
    const options = {
      bucket: '36195286554965740635-testbucket',
      applicationName: 'TestApplication'
    };
    let ebDeploy;

    beforeEach(() => {
      mock('fs', { readFileSync: sandbox.stub().returns(mockFileBody) });
      EBDeploy = mock.reRequire('../src/EBDeploy');
      ebDeploy = new EBDeploy(options);
      sandbox.stub(ebDeploy.s3, 'putObject').returns({ promise: () => Promise.resolve() });
      sandbox.stub(ebDeploy.s3, 'waitFor').returns({ promise: () => Promise.resolve() });
    });

    it('calls s3.putObject with bucket, body and key', async () => {
      await ebDeploy.upload(archiveName, '');
      expect(ebDeploy.s3.putObject).to.have.been.calledWith({
        Bucket: options.bucket,
        Body: mockFileBody,
        Key: options.applicationName + '/' + archiveName
      });
    });

    it('calls s3.waitFor with `objectExists`, bucket and key', async () => {
      await ebDeploy.upload(archiveName, '');
      expect(ebDeploy.s3.waitFor).to.have.been.calledWith('objectExists', {
        Bucket: options.bucket,
        Key: options.applicationName + '/' + archiveName
      });
    });

    it('returns the S3 key including the application name', async () => {
      const result = await ebDeploy.upload(archiveName, '');
      expect(result).to.equal(options.applicationName + '/' + archiveName);
    });

    it('returns the S3 key including the bucket path if it is defined', async () => {
      const bucketPath = 'testpath';
      ebDeploy.options.bucketPath = bucketPath;
      const result = await ebDeploy.upload(archiveName, '');
      expect(result).to.equal(bucketPath + '/' + archiveName);
    });
  });

  describe('createAppVersion (s3Key)', () => {
    let ebDeploy;

    const s3Key = 'path/file.zip';
    const options = {
      applicationName: 'TestApplication',
      environmentName: 'TestEnvironment',
      versionLabel: 'v0.0.0-test',
      versionDescription: 'This is a test version description',
      bucket: '36195286554965740635-testbucket'
    };

    beforeEach(() => {
      ebDeploy = new EBDeploy(Object.assign({}, options));
      sandbox.stub(ebDeploy.eb, 'createApplicationVersion').returns({
        promise: () => Promise.resolve({
          ApplicationVersion: {
            VersionLabel: options.versionLabel
          }
        })
      });
    });

    it('returns the created version label', async () => {
      const version = await ebDeploy.createAppVersion(s3Key);
      expect(version).to.equal(options.versionLabel);
    });

    it('calls eb.createApplicationVersion with all necessary parameters', async () => {
      await ebDeploy.createAppVersion(s3Key);
      expect(ebDeploy.eb.createApplicationVersion).to.have.been.calledWith({
        ApplicationName: options.applicationName,
        VersionLabel: options.versionLabel,
        Description: options.versionDescription,
        SourceBundle: {
          S3Bucket: options.bucket,
          S3Key: s3Key
        },
        AutoCreateApplication: false
      });
    });

    it('shortens the description to 200 chars', async () => {
      const longDescription = 'lN57uF6q7bZbj8OExQr9YtwWYu7B16IwfEeYTJdQyhCtWRWhlcggEebC9WZvKxcUyHkZIzIVyrVU9ShWKZI3VpP1W0oZ2mF6pgTN10dGkicPoqYzZ0ZPxbDI7NTbKKGy29TcxcBVzbI0uJ50S63CVUUrwk2v5fagMHbJ8S0OnfzR0jIthCp1zXT0IdaX6wNMugf256YEuLzzOOMjBGAyXI1tYzGjgzw88Rz5VmhK6ZFFk7klKJ3ORrmo0oYqBVEd3SOmD4zuFsmZHQAHkk024cC4VYKStFfMREVKDuaV02Tk';
      ebDeploy.options.versionDescription = longDescription;
      await ebDeploy.createAppVersion(s3Key);
      expect(ebDeploy.eb.createApplicationVersion.args[0][0].Description.length).to.equal(200);
    });
  });

  describe('updateEnvironment (versionLabel)', () => {
    const version = 'v0.0.0-test';
    const environmentName = 'TestEnvironment';
    let ebDeploy;

    beforeEach(() => {
      ebDeploy = new EBDeploy({ environmentName });
      sandbox.stub(ebDeploy.eb, 'updateEnvironment').returns({ promise: () => Promise.resolve() });
    });

    it('returns a promise', () => {
      expect(ebDeploy.updateEnvironment(version)).to.be.a('promise');
    });

    it('calls eb.updateEnvironment with EnvironmentName and VersionLabel parameters', () => {
      return ebDeploy.updateEnvironment(version).then(() => {
        expect(ebDeploy.eb.updateEnvironment).to.have.been.calledWith({
          EnvironmentName: environmentName,
          VersionLabel: version
        });
      });
    });
  });

  describe('waitUntilDeployed ()', () => {
    let ebDeploy;
    let Events;
    let Environments;
    let delayStub;

    const options = {
      applicationName: 'TestApplication',
      environmentName: 'TestEnvironment',
      versionLabel: 'v0.0.0-test',
      versionDescription: 'This is a test version description',
      bucket: '36195286554965740635-testbucket'
    };

    beforeEach(() => {
      delayStub = sandbox.stub().returns(Promise.resolve());
      mock('delay', delayStub);
      EBDeploy = mock.reRequire('../src/EBDeploy');
      ebDeploy = new EBDeploy(Object.assign({}, options));
      Events = [{
        ApplicationName: options.applicationName,
        EnvironmentName: options.environmentName,
        EventDate: new Date(),
        Message: 'Environment health has transitioned from Info to Ok.',
        Severity: 'INFO'
      }];
      Environments = [{ Status: 'Ready' }];
      sandbox.stub(ebDeploy.eb, 'describeEnvironments').returns({
        promise: () => Promise.resolve({ Environments })
      });
      sandbox.stub(ebDeploy.eb, 'describeEvents').returns({
        promise: () => Promise.resolve({ Events })
      });
      sandbox.stub(console, 'info');
      sandbox.stub(console, 'error');
    });

    it('calls eb.describeEnvironments with ApplicationName and EnvironmentNames', async () => {
      await ebDeploy.waitUntilDeployed();
      expect(ebDeploy.eb.describeEnvironments).to.have.been.calledWith({
        ApplicationName: options.applicationName,
        EnvironmentNames: [ options.environmentName ]
      });
    });

    it('calls eb.describeEvents with ApplicationName, EnvironmentName and StartTime', async () => {
      const startTime = new Date();
      ebDeploy.startTime = startTime;
      await ebDeploy.waitUntilDeployed();
      expect(ebDeploy.eb.describeEvents).to.have.been.calledWith({
        ApplicationName: options.applicationName,
        EnvironmentName: options.environmentName,
        StartTime: startTime
      });
    });

    it('calls console.info with event date, severity and message', async () => {
      await ebDeploy.waitUntilDeployed();
      expect(console.info).to.have.been.calledOnce;
      expect(console.info.args[0]).to.match(/(.*)\s\[(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\]\s(.*)/);
    });

    it('throws an Error if error count is above 0', async () => {
      Events = [{
        ApplicationName: options.applicationName,
        EnvironmentName: options.environmentName,
        EventDate: new Date(),
        Message: 'Application version already exists',
        Severity: 'ERROR'
      }];
      return expect(ebDeploy.waitUntilDeployed()).to.be.rejectedWith('Deployment failed.');
    });

    it('calls console.error with error message', async () => {
      Events = [{
        ApplicationName: options.applicationName,
        EnvironmentName: options.environmentName,
        EventDate: new Date(),
        Message: 'Application version already exists',
        Severity: 'ERROR'
      }];
      try {
        await ebDeploy.waitUntilDeployed();
      } catch (e) {}
      expect(console.error).to.have.been.calledOnce;
      expect(console.error.args[0]).to.match(/(.*)\s\[ERROR\]\s(.*)/);
    });

    it('calls delay() with 5 seconds if environmentStatus is not `Ready`', async () => {
      Environments = [{ Status: 'Updating' }];
      process.nextTick(() => {
        Environments = [{ Status: 'Ready' }];
      });
      await ebDeploy.waitUntilDeployed();
      expect(delayStub).to.have.been.calledWith(5000);
    });
  });

  describe('cleanup ()', () => {
    let ebDeploy;
    let shStub;

    beforeEach(() => {
      shStub = sandbox.stub();
      mock('shell-tag', shStub);
      EBDeploy = mock.reRequire('../src/EBDeploy');
    });

    it('executes `git clean` shell command', () => {
      ebDeploy = new EBDeploy();
      ebDeploy.cleanup();
      expect(shStub).to.have.been.calledWith(['git clean -fd']);
    });

    it('does not execute `git clean` shell command if skipCleanup is enabled', () => {
      ebDeploy = new EBDeploy({
        skipCleanup: true
      });
      ebDeploy.cleanup();
      expect(shStub).to.not.have.been.calledWith(['git clean -fd']);
    });
  });

  describe('getters', () => {
    let ebDeploy;

    describe('getBucket ()', () => {
      it('returns bucket from options if set', async () => {
        const bucket = 'testBucket';
        ebDeploy = new EBDeploy({ bucket });
        const result = await ebDeploy.getBucket();
        expect(result).to.equal(bucket);
      });

      it('returns bucket returned from createOrGetStorageLocation() by default', async () => {
        const bucket = 'testDefaultBucket';
        ebDeploy = new EBDeploy();
        sandbox.stub(ebDeploy, 'createOrGetStorageLocation').resolves(bucket);
        const result = await ebDeploy.getBucket();
        expect(result).to.equal(bucket);
      });

      it('only calls createOrGetStorageLocation() once', async () => {
        const bucket = 'testDefaultBucket';
        ebDeploy = new EBDeploy();
        sandbox.stub(ebDeploy, 'createOrGetStorageLocation').resolves(bucket);
        await ebDeploy.getBucket();
        await ebDeploy.getBucket();
        expect(ebDeploy.createOrGetStorageLocation).to.have.been.calledOnce;
      });
    });

    describe('region ()', () => {
      it('returns region from options if set', () => {
        const region = 'testRegion';
        ebDeploy = new EBDeploy({ region });
        expect(ebDeploy.region).to.equal(region);
      });

      it('returns region from env vars if not set in options', () => {
        process.env.AWS_DEFAULT_REGION = 'envTestRegion';
        ebDeploy = new EBDeploy();
        expect(ebDeploy.region).to.equal(process.env.AWS_DEFAULT_REGION);
        delete process.env.AWS_DEFAULT_REGION;
      });

      it('returns "eu-central-1" as DEFAULT_REGION by default', () => {
        ebDeploy = new EBDeploy();
        expect(ebDeploy.region).to.equal('eu-central-1');
      });
    });

    describe('versionLabel ()', () => {
      it('returns versionLabel from options if set', () => {
        const versionLabel = 'testVersionLabel';
        ebDeploy = new EBDeploy({ versionLabel });
        expect(ebDeploy.versionLabel).to.equal(versionLabel);
      });

      it('returns versionLabel from env vars if not set in options', () => {
        process.env.ELASTIC_BEANSTALK_LABEL = 'envTestVersionLabel';
        ebDeploy = new EBDeploy();
        expect(ebDeploy.versionLabel).to.equal(process.env.ELASTIC_BEANSTALK_LABEL);
      });

      it('returns sha and timestamp by default', () => {
        ebDeploy = new EBDeploy();
        sandbox.stub(ebDeploy, 'sha').get(() => '9999999');
        expect(ebDeploy.versionLabel).to.match(/sha-9{7}-\d{13,}/);
      });

      it('returns the same sha and timestamp on the second call', () => {
        ebDeploy = new EBDeploy();
        sandbox.stub(ebDeploy, 'sha').get(() => '9999999');
        const versionLabel = ebDeploy.versionLabel;
        expect(versionLabel).to.equal(ebDeploy.versionLabel);
      });

      afterEach(() => {
        delete process.env.ELASTIC_BEANSTALK_LABEL;
      });
    });

    describe('versionDescription ()', () => {
      it('returns versionDescription from options if set', () => {
        const versionDescription = 'testVersionDescription';
        ebDeploy = new EBDeploy({ versionDescription });
        expect(ebDeploy.versionDescription).to.equal(versionDescription);
      });

      it('returns versionDescription from env vars if not set in options', () => {
        process.env.ELASTIC_BEANSTALK_DESCRIPTION = 'envTestVersionDescription';
        ebDeploy = new EBDeploy();
        expect(ebDeploy.versionDescription).to.equal(process.env.ELASTIC_BEANSTALK_DESCRIPTION);
      });

      it('returns last commit message by default', () => {
        const mockCommitMsg = 'Mock Last Commit Message';
        ebDeploy = new EBDeploy();
        sandbox.stub(ebDeploy, 'commitMsg').get(() => mockCommitMsg);
        expect(ebDeploy.versionDescription).to.equal(mockCommitMsg);
      });

      afterEach(() => {
        delete process.env.ELASTIC_BEANSTALK_DESCRIPTION;
      });
    });

    describe('environmentName ()', () => {
      it('returns environmentName from options if set', () => {
        const environmentName = 'testEnvironmentName';
        ebDeploy = new EBDeploy({ environmentName });
        expect(ebDeploy.environmentName).to.equal(environmentName);
      });

      it('returns environmentName from env vars if not set in options', () => {
        process.env.ELASTIC_BEANSTALK_ENVIRONMENT = 'envTestEnvironmentName';
        ebDeploy = new EBDeploy();
        expect(ebDeploy.environmentName).to.equal(process.env.ELASTIC_BEANSTALK_ENVIRONMENT);
      });

      it('returns undefined if not set in options or in env vars', () => {
        ebDeploy = new EBDeploy();
        expect(ebDeploy.environmentName).to.not.be.ok;
      });

      afterEach(() => {
        delete process.env.ELASTIC_BEANSTALK_ENVIRONMENT;
      });
    });

    describe('sha ()', () => {
      const mockSha = '1111111';
      let shStub;

      beforeEach(() => {
        shStub = sandbox.stub().returns(mockSha);
        mock('shell-tag', shStub);
        EBDeploy = mock.reRequire('../src/EBDeploy');
        ebDeploy = new EBDeploy();
      });

      it('returns sha from env vars if set', () => {
        process.env.GIT_SHA = '9999999';
        expect(ebDeploy.sha).to.equal(process.env.GIT_SHA);
      });

      it('calls `git rev-parse` shell command', () => {
        ebDeploy.sha;
        expect(shStub).to.have.been.calledWith(['git rev-parse --short HEAD']);
      });

      it('calls `git rev-parse` shell command only the first time', () => {
        ebDeploy.sha;
        ebDeploy.sha;
        expect(shStub).to.have.been.calledOnce;
      });

      it('returns git sha from shell command', () => {
        expect(ebDeploy.sha).to.equal(mockSha);
      });

      afterEach(() => {
        delete process.env.GIT_SHA;
      });
    });

    describe('commitMsg ()', () => {
      const mockCommitMsg = 'This is a mock commit message';
      let shStub;

      beforeEach(() => {
        shStub = sandbox.stub().returns(mockCommitMsg);
        mock('shell-tag', shStub);
        EBDeploy = mock.reRequire('../src/EBDeploy');
        ebDeploy = new EBDeploy();
        sandbox.stub(ebDeploy, 'sha').get(() => '9999999');
      });

      it('calls `git log` shell command', () => {
        ebDeploy.commitMsg;
        expect(shStub).to.have.been.calledWith(['git log ', ' -n 1 --pretty=%B']);
      });

      it('calls `git log` shell command only the first time', () => {
        ebDeploy.commitMsg;
        ebDeploy.commitMsg;
        expect(shStub).to.have.been.calledOnce;
      });

      it('returns git commitMsg from shell command', () => {
        expect(ebDeploy.commitMsg).to.equal(mockCommitMsg);
      });
    });

    describe('archiveName ()', () => {
      it('returns versionLabel string with zip extension', () => {
        const versionLabel = 'testVersionLabel';
        ebDeploy = new EBDeploy({ versionLabel });
        expect(ebDeploy.archiveName).to.equal(versionLabel + '.zip');
      });
    });
  });

  afterEach(() => {
    sandbox.restore();
    mock.stopAll();
  });
});
