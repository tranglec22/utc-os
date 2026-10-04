# Echo Trace -> Second Brain contract

Echo Trace should send finished transcription metadata to `POST /v1/ingest`.

Raw recordings and full transcripts remain source material. They are **not** automatically turned into durable memory.

Example explicit memory event:

```json
{
  "sourceType": "echo-trace",
  "sourceRef": "recording-id",
  "payload": {
    "explicitMemory": true,
    "recordingId": "recording-id",
    "memory": {
      "title": "Decision title",
      "detail": "Small durable fact, decision, preference, or project-state change.",
      "workspace": "UTC.OS",
      "bucket": "inbox",
      "sensitivity": "private",
      "confidence": 1
    }
  }
}
```

The daily rollup will only auto-promote a structured item when Bastion marks it approved. Raw or inferred material remains queued for review.
