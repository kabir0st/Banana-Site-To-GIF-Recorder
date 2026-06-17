# Privacy Policy for Banana Gif Recorder

**Effective date:** June 17, 2026
**Last updated:** June 17, 2026

Banana Gif Recorder (“the Extension”) is a Chrome browser extension that records the
current browser tab and turns it into a GIF. This policy explains what the Extension
does and does not do with your information.

**Short version:** The Extension does **not** collect, store, transmit, or sell any
personal data. Everything happens locally, inside your own browser, on your own device.

---

## 1. Information we collect

**None.**

The Extension does not collect or transmit any personal or usage data. Specifically, it
does **not**:

- Collect personally identifiable information (name, email, address, etc.).
- Track your browsing history, search history, or activity.
- Use analytics, telemetry, cookies, advertising identifiers, or fingerprinting.
- Send any data to the developer or to any third-party server.
- Include any third-party tracking or advertising libraries.

The page content captured during a recording is processed **entirely on your device**
and is never uploaded anywhere.

---

## 2. How your recording is handled

When you start a recording:

1. The Extension captures frames from the tab you are currently viewing.
2. Those frames are assembled into a GIF locally, in your browser, using a bundled
   library (`gif.js`) running in an offscreen document. No network connection is used
   for this.
3. The finished GIF is held **temporarily** in your browser’s local extension storage
   (`chrome.storage.local`) only so the popup can display a preview and let you download it.
4. The data stays on your machine. When you start a new recording or close the
   session, the previous GIF data is replaced/cleared.

You choose if and when to save the GIF to your computer via the **Download** button.
Saved files live on your device and are never accessed again by the Extension.

---

## 3. Permissions and why they are needed

The Extension requests only the permissions required to record and save a GIF. None of
them are used to collect or share your data.

| Permission | Why it is used |
|---|---|
| `activeTab` / `tabs` | Identify the tab you want to record when you open the popup. |
| `tabCapture` | Capture the visual frames of the current tab for the GIF. |
| `scripting` | Inject a small content script that smooth-scrolls the page so the whole page can be captured. |
| `offscreen` | Run the GIF-encoding work in a background offscreen document. |
| `storage` / `unlimitedStorage` | Temporarily hold the generated GIF locally so it can be previewed and downloaded (GIFs can be large). |
| `downloads` | Let you save the finished GIF to your computer. |
| `host_permissions` (`<all_urls>`) | Allow you to record whichever website you choose. Access is only ever used on the tab you actively record; no browsing data is read or stored. |

---

## 4. Data sharing and selling

We do not share, sell, rent, or trade any data, because we do not collect any. No data
ever leaves your device through the Extension.

---

## 5. Data retention

The Extension does not retain data on any server (there is no server). The only data it
stores is the most recent generated GIF, kept locally and temporarily so you can preview
and download it. You can clear it at any time by removing the Extension or clearing its
storage from `chrome://extensions`.

---

## 6. Children’s privacy

The Extension is not directed at children and does not knowingly collect any information
from anyone, including children under 13.

---

## 7. Third-party services

The Extension does not integrate any third-party analytics, advertising, or data
services. The only external link in the interface is an optional link to the developer’s
personal portfolio website, which you may choose to click; the Extension itself sends no
data to it.

---

## 8. Changes to this policy

If this policy changes, the updated version will be posted at this same location with a
revised “Last updated” date. Material changes will be reflected in the extension listing.

---

## 9. Contact

If you have questions about this privacy policy, please open an issue on the project
repository or contact the developer:

- **Developer:** Kabir S. Tamari
- **Email:** lurayy36@gmail.com
- **Repository:** https://github.com/kabir0st/banana-gif-recorder

---

*This Extension performs all recording, encoding, and storage locally in your browser. No
data is collected or transmitted.*
