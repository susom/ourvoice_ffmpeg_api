# Ourvoice ffmpeg API

### Api intended for mp3 conversion from .wav and .amr filetypes
### This repository contains the definitions of two cloud functions

## generateUploadUrl

- Function that will generate a signed URL upon use.
The returned function can then be invoked to store files in their corresponding location in the ourvoice storage bucket.

Example POST parameters:
```
Headers: {
    application/x-www-form-urlencoded
}
```
```
Body: {
    fileName:apple.wav
    walkHash:6C5A44C4-4A0F-47D1-852B-0981E6628ABE
    projectAbv:JOR
    bucketName:ov_walk_files
}
```
The response will look similar to this:

```
https://storage.googleapis.com/ov_walk_files/JOR/6C5A44C4-4A0F-47D1-852B-0981E6628ABE/1626305726210/apple.wav?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...
```
You can then send a PUT request to the response url like so:
```
curl -X PUT -H 'Content-Type: audio/x-wav' --upload-file apple.wav {SIGNED_URL}}
```



## ffmpegTrigger
- Function called on cloud storage upload trigger of either .wav or .amr filetypes
- Converts audio format to .mp3 and stores in cloud storage

## Deployment
The following commands can be run to deploy both cloud functions:

1.  `gcloud functions deploy generateUploadUrl --entry-point app --runtime nodejs14 --trigger-http --env-vars-file .env.yaml`



2. `gcloud functions deploy ffmpegTrigger --runtime nodejs14 --trigger-resource ov_walk_files --trigger-event google.storage.object.finalize --max-instances 20 --timeout 120s --env-vars-file .env.yaml`

Both `.env.yaml` files will need to be present in their corresponding deployment folders.
Root folder for generateUpload and ffmpeg_mp3_trigger for the gcloud storage activation trigger

## Local development

The following launch.json file can be used for VSCode development

```
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}/index.js"
            
        },
        {
            "name": "Launch via NPM",
            "type": "node",
            "request": "launch",
            "cwd": "${workspaceFolder}",
            "runtimeExecutable": "npm",
            "runtimeArgs": [
                "run-script",
                "start",
                "--",
                "--inspect-brk=9229"
            ],
            "port": 9229
        }
    ]
}
```
