# Changelog

## 1.1.0

- New optional chart panel (`chart: true`): a button in the popup swaps the gauge for a chart of download and upload speed over time. The popup always opens on the gauge.
- Ready for multi-gigabit lines: the download uses 8 connections with blocks that grow from 5 to 50 MB while the line keeps up, and falls back to smaller blocks if the server refuses a size. The upload uses 6 connections with blocks up to 32 MB.
- New `max` option: top of the gauge scale in Mbit/s (100 to 10000, default 1000).
- No changes are needed in existing cards.

## 1.0.0

- First release. Speed test in a popup with a live gauge: ping, jitter, download and upload, measured from the device you are using. Optional Home Assistant helpers to store the result. English and Portuguese.
