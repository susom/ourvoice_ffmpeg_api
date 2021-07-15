const express = require('express');
const fs = require('fs');

const { Storage } = require('@google-cloud/storage');
const projectId = process.env.projectId //Alter for local testing
const keyFilename = './som-rit-ourvoice-cloud-storage-key.json';
const app = express();

var storage;

if (fs.existsSync(keyFilename))
  storage = new Storage({ projectId, keyFilename });
else
  storage = new Storage({ projectId });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */
app.post('/', async (req, res, next) => {
  try {
    const { bucketName, fileName, projectAbv, walkHash } = req.body;
    const unixTimestamp = new Date().getTime();
    const storageLocation = `${projectAbv}/${walkHash}/${unixTimestamp}/${fileName}`;
    const url = await generateV4UploadSignedUrl(bucketName, storageLocation);

    res.status(200).send({ 'signedUrl': url });

    /*
        File will be produced at bucketName/projectAbv/walkHash/CurrentTime
    */

  } catch (err) {
    next(err);
  }
});

async function generateV4UploadSignedUrl(bucketName, storageLocation) {

  // These options will allow temporary uploading of the file with outgoing
  // Content-Type: application/octet-stream header.
  const options = {
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: 'audio/x-wav',
  };

  // Get a v4 signed URL for uploading file
  const [url] = await storage
    .bucket(bucketName)
    .file(storageLocation)
    .getSignedUrl(options);


  // console.log('You can use this URL with any user agent, for example:');
  // console.log(
  //   "curl -X PUT -H 'Content-Type: audio/x-wav' " +
  //     `--upload-file my-file '${url}'`
  // );
  return url;
}

module.exports = {
  app
};