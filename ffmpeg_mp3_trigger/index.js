const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Storage } = require('@google-cloud/storage');
const projectId = process.env.projectId //Alter for local testing
const keyFilename = '../som-rit-ourvoice-cloud-storage-key.json';

var storage;

if (fs.existsSync(keyFilename))
    storage = new Storage({ projectId, keyFilename });
else
    storage = new Storage({ projectId });

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * HTTP Cloud Function.
 *
 * @param {Object} file - triggered file info
 *
 * @param {Object} context - event context, type, and id
 */

exports.ffmpegTrigger = async (file, context) => {
    if (file.name.includes('.wav') || file.name.includes('.amr')) { // Only audio files uploaded via mobile
        console.log(`Starting conversion for file: ${file.name} in bucket ${file.bucket}`)
        
        var output_name, tempFilePath, tempMp3;
        
        if(file.name.includes('.wav')){
            output_name = file.name.replace('.wav', '.mp3');
            tempFilePath = path.join(os.tmpdir(), 'temp.wav'); //Grab local VM temp dir as wav
            tempMp3 = tempFilePath.replace('.wav', '.mp3'); 
        } else {
            output_name = file.name.replace('.amr', '.mp3');
            tempFilePath = path.join(os.tmpdir(), 'temp.amr'); //Grab local VM temp dir as amr
            tempMp3 = tempFilePath.replace('.amr', '.mp3'); 
        }

        await storage.bucket('ov_walk_files').file(file.name) //Save current file locally to VM temp dir
            .download({ destination: tempFilePath })
            .then(()=> console.log(`Finished download of ${file.name} to temp filepath in local VM :  ${tempFilePath}`))
            .catch((err) => {
                console.log(`Error saving ${file.name} to temp`)
                console.log(err)
                return null;
            })

        await processAudio(tempFilePath, tempMp3); //Convert audio to temp.mp3 via ffmpeg

        const options = {
            destination: `${output_name}`
        };

        await storage.bucket('ov_walk_files').upload(`${tempMp3}`, options)
            .then((res) => {
                console.log(`finished upload of ${tempFilePath} to ${output_name}`);
                fs.unlinkSync(tempMp3);
                fs.unlinkSync(tempFilePath);
                return null;
            })
            .catch(err => {
                console.log(`error in storage download callback `, err);
                fs.unlinkSync(tempMp3);
                fs.unlinkSync(tempFilePath);
                return null;
            })

        // Once the image has been converted delete the local files to free up disk space.
        

    } else { // This file is not an audio file we want to convert
        return null;
    }
};

function processAudio(tempFilePath, tempOutputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
            .audioBitrate('192k')
            .audioChannels(2)
            .audioFrequency(44100)
            .noVideo()
            .save(`${tempOutputPath}`)
            .on('start', function (commandLine) {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
            })
            .on('error', function (err) {
                console.log('An error occurred: ' + err.message);
                return reject(new Error(err))
            })
            .on('end', function () {
                console.log(`Processing finished, Mp3 created at ${tempOutputPath} !`);
                return resolve()
            })

    })
}
