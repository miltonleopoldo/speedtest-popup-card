# Speedtest Popup Card

A Home Assistant dashboard card that runs an internet speed test in a popup: ping, jitter, download and upload, with a live gauge. The test runs in the browser of the device you are looking at the dashboard on, so it measures that device's connection, not the Home Assistant server's.

[Versão em português](README.pt-PT.md)

![The speed test popup with the result of a test](images/result.png)

The card itself is a single button. It shows the last result on the right:

![The card as it appears on the dashboard](images/button.png)

## What it does

- Opens a popup on top of the dashboard and runs the test when you press **Start test**. A test takes about 25 seconds.
- Measures ping and jitter first, then download, then upload. The gauge follows the speed in real time.
- Can store the result in Home Assistant helpers, so you can chart it, use it in automations or show it on other cards. This is optional.
- Without helpers, it remembers the last result in the browser.
- English and Portuguese. It follows the language of your Home Assistant profile.
- No other cards or integrations are needed.

## How the measurement works

The card talks to Cloudflare's public speed test endpoints (`speed.cloudflare.com`) directly from your browser:

| Value | How it is measured |
| --- | --- |
| Ping | The fastest of 16 small requests |
| Jitter | The median difference between consecutive requests |
| Download | 6 parallel connections fetching 5 MB blocks for 10 seconds |
| Upload | 4 parallel connections sending 1 to 16 MB blocks for 10 seconds |

Things to know before you rely on the numbers:

- **It measures the device in front of you.** On a wired PC you get the line speed. On a phone you get that phone's Wi-Fi. This is different from the built-in Speedtest.net integration, which runs on the Home Assistant server.
- **Ping is higher than a classic ping.** It is measured with web requests, which add some overhead.
- **A browser test usually reads a little below a native app** on very fast lines.
- **The device needs internet access** and must be able to reach `speed.cloudflare.com`.
- **Cloudflare can limit or change these endpoints.** They are public, but they are not a guaranteed service for third parties. If requests are refused, the card falls back to smaller blocks; if everything is refused, it shows "Test failed" and stores nothing. Running many tests in a row can trigger these limits.
- **Each test uses data:** roughly 1 GB down and 500 MB up on a 1 Gbit/s line with the default duration. Lower `duration` on metered connections.

## Installation

### Home Assistant Marketplace (HACS)

1. Go to **Settings → Marketplace** (on older versions, open **HACS**).
2. Choose **Add from link** (in HACS: **⋮ → Custom repositories**, type **Dashboard**).
3. Paste the address of this repository and press **Install**.
4. Refresh the browser with **Ctrl + F5**.

### Manual

1. Download `speedtest-popup-card.js` from this repository.
2. Copy it to the `config/www` folder of your Home Assistant.
3. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**.
4. Enter `/local/speedtest-popup-card.js` and choose **JavaScript module**.
5. Refresh the browser with **Ctrl + F5**.

## Adding the card

Edit your dashboard, choose **Add card → Manual** and paste:

```yaml
type: custom:speedtest-popup-card
```

That is all the card needs. It will keep the last result in the browser.

## Storing results in Home Assistant (optional)

Create up to four **Number** helpers in **Settings → Devices & services → Helpers → Create helper → Number**:

| Helper | Suggested name | Minimum | Maximum | Step | Unit |
| --- | --- | --- | --- | --- | --- |
| Download | Speed test download | 0 | 10000 | 0.1 | Mbit/s |
| Upload | Speed test upload | 0 | 10000 | 0.1 | Mbit/s |
| Ping | Speed test ping | 0 | 5000 | 0.1 | ms |
| Jitter | Speed test jitter | 0 | 5000 | 0.1 | ms |

Then point the card at them:

```yaml
type: custom:speedtest-popup-card
entities:
  download: input_number.speed_test_download
  upload: input_number.speed_test_upload
  ping: input_number.speed_test_ping
  jitter: input_number.speed_test_jitter
```

You can list only the ones you want. The card writes the result to each helper at the end of a successful test, and the button shows the last result from them.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `title` | `Speed test` | Text on the button and at the top of the popup |
| `duration` | `10` | Seconds for the download phase and again for the upload phase (4 to 30) |
| `language` | `auto` | `auto` follows your Home Assistant profile; `en` or `pt` forces a language |
| `entities` | none | Helpers that receive the result: `download`, `upload`, `ping`, `jitter` |

Example with every option:

```yaml
type: custom:speedtest-popup-card
title: Internet speed
duration: 8
language: en
entities:
  download: input_number.speed_test_download
  upload: input_number.speed_test_upload
  ping: input_number.speed_test_ping
  jitter: input_number.speed_test_jitter
```

## Troubleshooting

| What you see | What to do |
| --- | --- |
| "Custom element doesn't exist: speedtest-popup-card" | The resource is missing or the browser has an old copy. Check **Resources** and press Ctrl + F5 |
| "Test failed: the server refused the download" | Cloudflare is limiting requests from your address. Wait a few minutes and try again |
| The result is not saved in Home Assistant | Check that the helper names under `entities` exist and are spelled exactly as in **Settings → Entities** |
| The speed is much lower than expected | The test measures the device you are using. Try from a wired computer |

## Licence

MIT. See [LICENSE](LICENSE).

This card is not affiliated with Cloudflare, Ookla or Home Assistant.
