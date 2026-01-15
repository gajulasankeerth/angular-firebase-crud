const functions = require('firebase-functions');
const { google } = require('googleapis');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json',
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

exports.uploadToDrive = functions.https.onRequest((req, res) => {
  upload.single('file')(req, res, async () => {
    try {
      const drive = google.drive({ version: 'v3', auth });

      await drive.files.create({
        requestBody: {
          name: `Form_${Date.now()}.pdf`,
          parents: ['1SvHfgsKNXhzVaW-xAfpcCwm3UrjG-93X'],
        },
        media: {
          mimeType: 'application/pdf',
          body: req.file.buffer,
        },
      });

      res.status(200).send('Saved silently');
    } catch (err) {
      console.error(err);
      res.status(500).send('Upload failed');
    }
  });
});
