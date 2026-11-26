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

## ffmpegTrigger-2
- Same conversion logic as ffmpegTrigger, deployed as a separate Cloud Function
- Source: `ffmpeg_mp3_trigger/`
- Runtime: Node.js 22
- Trigger: `google.storage.object.finalize` on bucket `transform_ov_walk_files`
- Destination bucket: `ov_walk_files`

## Deployment

### generateUploadUrl

```
gcloud functions deploy generateUploadUrl --entry-point app --runtime nodejs14 --trigger-http --env-vars-file .env.yaml
```

### ffmpegTrigger (legacy)

```
gcloud functions deploy ffmpegTrigger --runtime nodejs18 --trigger-resource ov_walk_files --trigger-event google.storage.object.finalize --max-instances 20 --timeout 120s --memory 256M --env-vars-file .env.yaml --docker-registry=artifact-registry
```

### ffmpegTrigger-2 (run from `ffmpeg_mp3_trigger/`)

Requires `.env.yaml` in `ffmpeg_mp3_trigger/` with `projectId` and `finalBucketName` (not committed to git).

```
gcloud functions deploy ffmpegTrigger-2 \
  --project som-rit-ourvoice \
  --region us-central1 \
  --runtime nodejs22 \
  --entry-point ffmpegTrigger \
  --trigger-resource transform_ov_walk_files \
  --trigger-event google.storage.object.finalize \
  --memory 1024MB \
  --timeout 240s \
  --max-instances 20 \
  --env-vars-file .env.yaml \
  --docker-registry artifact-registry
```

### Rollback ffmpegTrigger-2

Check out the last known-good tag and redeploy with the previous runtime:

```
git checkout live-ffmpegTrigger-2-2025-07 -- ffmpeg_mp3_trigger/
```

Then run from `ffmpeg_mp3_trigger/`:

```
gcloud functions deploy ffmpegTrigger-2 \
  --project som-rit-ourvoice \
  --region us-central1 \
  --runtime nodejs20 \
  --entry-point ffmpegTrigger \
  --trigger-resource transform_ov_walk_files \
  --trigger-event google.storage.object.finalize \
  --memory 1024MB \
  --timeout 240s \
  --max-instances 20 \
  --env-vars-file .env.yaml \
  --docker-registry artifact-registry
```

All `.env.yaml` files must be present in their corresponding deployment folders.
Root folder for generateUploadUrl and `ffmpeg_mp3_trigger/` for ffmpegTrigger-2

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
