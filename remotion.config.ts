import fs from 'node:fs';
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// Standard broadcast-range BT.709 output so dark scenes look the same in every player.
Config.setColorSpace('bt709');

// Prefer an explicit browser, then the preinstalled headless shell, so renders
// work without downloading Chrome.
const preinstalled = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = process.env.REMOTION_BROWSER ?? (fs.existsSync(preinstalled) ? preinstalled : null);
if (browser) {
  Config.setBrowserExecutable(browser);
}
