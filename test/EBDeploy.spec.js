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

  describe('deploy ()', () => {});

  describe('appVersionExists ()', () => {
    let ebDeploy;
    let response;

    const options = {
      applicationName: 'testApplicationName',
      versionLabel: 'v0.0.0-test'
    };

    beforeEach(() => {
      ebDeploy = new EBDeploy(options);
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
  });

  describe('bucketExists ()', () => {
    let ebDeploy;

    const options = {
      bucket: '36195286554965740635-testbucket'
    };

    beforeEach(() => {
      ebDeploy = new EBDeploy(options);
      sandbox.stub(ebDeploy.s3, 'headBucket').returns({ promise: () => Promise.resolve() });
    });

    it('calls s3.headBucket with Bucket property', async () => {
      await ebDeploy.bucketExists();
      expect(ebDeploy.s3.headBucket).to.have.been.calledWith({
        Bucket: options.bucket
      });
    });

    it('returns true if s3.headBucket request was successful', async () => {
      const result = await ebDeploy.bucketExists();
      expect(result).to.be.true;
    });

    it('returns false if s3.headBucket request returns a `NotFound` error', async () => {
      const error = new Error();
      error.code = 'NotFound';
      ebDeploy.s3.headBucket.throws(error);

      const result = await ebDeploy.bucketExists();
      expect(result).to.be.false;
    });

    it('throws an error if s3.headBucket request returns any other error than `NotFound`', () => {
      const error = new Error();
      error.code = 'Forbidden';
      ebDeploy.s3.headBucket.throws(error);

      return expect(ebDeploy.bucketExists()).to.eventually.be.rejectedWith(error);
    });
  });

  describe('createBucket ()', () => {
    let ebDeploy;

    const options = {
      bucket: '36195286554965740635-testbucket'
    };

    beforeEach(() => {
      ebDeploy = new EBDeploy(options);
      sandbox.stub(ebDeploy.s3, 'createBucket').returns({ promise: () => Promise.resolve() });
    });

    it('returns a promise', () => {
      expect(ebDeploy.createBucket(options)).to.be.a('promise');
    });
  });

  describe('createZip ()', () => {
    let ebDeploy;
    let shStub = sandbox.stub().returns('');

    const options = {
      versionLabel: 'v1.0.0-test'
    };

    beforeEach(() => {
      mock('shell-tag', shStub);
      EBDeploy = mock.reRequire('../src/EBDeploy');
      ebDeploy = new EBDeploy(options);
    });

    it('executes `git archive` shell command', () => {
      ebDeploy.createZip();
      expect(shStub).to.have.been.calledWith(['git archive -o ', ' --format=zip HEAD']);
    });

    it('returns a path string', () => {
      expect(ebDeploy.createZip()).to.be.a('string');
    });
  });

  afterEach(() => {
    sandbox.restore();
    mock.stopAll();
  });
});
