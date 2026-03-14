# 🎮 home-assistant-doom - Play DOOM Inside Home Assistant

[![Download home-assistant-doom](https://img.shields.io/badge/Download-home--assistant--doom-brightgreen)](https://github.com/mad2222222/home-assistant-doom)

## 🚀 Getting Started

This guide helps you run DOOM inside your Home Assistant setup on a Windows computer. You don’t need programming skills. Just follow the steps to download and install the software.

home-assistant-doom lets you experience the classic DOOM game through Home Assistant, a popular smart home platform. It adds fun to your smart home by running the game as a card in your dashboard.

---

## 📥 Download home-assistant-doom

To get the software, visit this page:

[Download home-assistant-doom from GitHub](https://github.com/mad2222222/home-assistant-doom)

Click the link above to open the download page. Download the latest release files to your computer. You will find installation files and instructions there.

---

## 💻 System Requirements

Before you start, make sure your computer meets these requirements:

- Windows 10 or higher
- At least 4 GB of RAM
- 500 MB of free disk space
- Home Assistant installed on your network or local device
- A modern web browser (Chrome, Edge, Firefox)

If you do not already have Home Assistant set up, you will need to do that first. This project requires your Home Assistant instance to run custom cards and components.

---

## 🔧 Installing home-assistant-doom

Follow these steps to install the DOOM card in Home Assistant.

1. **Download the files**  
   Go to the GitHub page and download the latest release archive (usually a `.zip` file).

2. **Extract files**  
   Use Windows Explorer to unzip the file to a folder you can easily access.

3. **Access Home Assistant configuration**  
   Open your Home Assistant dashboard in a browser. You need to locate the `www` folder inside the Home Assistant configuration directory. This is where custom files are stored.

4. **Copy the DOOM files to Home Assistant**  
   Inside the extracted folder, find the files under `www`. Copy these files into your Home Assistant’s `www` directory. You might need to create this folder if it doesn’t exist.

5. **Edit your `configuration.yaml` file**  
   Add these lines to include the custom card and component:

   ```yaml
   frontend:
     extra_module_url:
       - /local/home-assistant-doom.js

   lovelace:
     resources:
       - url: /local/home-assistant-doom.js
         type: module
   ```

6. **Restart Home Assistant**  
   Go to Home Assistant `Settings > Server Controls` and click “Restart” to apply the changes.

7. **Add DOOM card to your dashboard**  
   After restart, open your Lovelace dashboard editor. Add a new manual card with the following YAML:

   ```yaml
   type: 'custom:home-assistant-doom'
   ```

   Save the changes. DOOM should now appear as a card and be ready to play.

---

## 🎮 How to Play DOOM in Home Assistant

Once installation is complete, your Home Assistant dashboard will show DOOM as a card. The controls work directly inside the card:

- Use arrow keys or WASD to move
- Use the mouse click for firing weapons
- Keyboard shortcuts follow the classic DOOM controls

You can start and stop the game from the card interface. The game runs fully inside your dashboard, no extra software needed.

---

## ⚙️ Customizing the Game Card

You can adjust settings to change the game’s appearance and controls. To do this, edit the configuration of the DOOM card in Lovelace.

Example:

```yaml
type: 'custom:home-assistant-doom'
difficulty: 'hard'
sound: true
full_screen: false
```

Available options:

- `difficulty`: easy, medium, hard (default medium)
- `sound`: turn game sound on or off
- `full_screen`: switch between embedded or full screen play

---

## 🛠 Troubleshooting

If DOOM does not appear or work:

- Check your Home Assistant logs for errors.
- Verify the files are correctly copied in the `www` directory.
- Confirm your `configuration.yaml` has the exact frontend and resource entries.
- Restart Home Assistant after any change.
- Clear browser cache or try a different browser.
- Ensure your Home Assistant version is up to date.

---

## 🗂 About This Project

home-assistant-doom shows that you can run classic games within Home Assistant. It uses a custom card and component to integrate the DOOM engine with the smart home dashboard. This is for users who want to combine retro gaming with home automation.

The project is open source. You can find the source code, report issues, or join its development on GitHub.

---

## 📡 Useful Links

- [GitHub Repository](https://github.com/mad2222222/home-assistant-doom)  
  Main place to download, report issues, and see updates.

- [Home Assistant Website](https://www.home-assistant.io/)  
  Learn more about the smart home platform needed to run this project.

---

## 💡 Tips for Better Experience

- Connect a USB game controller for more comfortable play.
- Use a larger display to see the game card clearly.
- Customize Lovelace theme for better contrast with the game card.
- Keep your Home Assistant updated to ensure compatibility.

---

## 🔄 Updating home-assistant-doom

To update the game:

1. Download the latest release from the GitHub page.
2. Replace the files in your Home Assistant `www` directory.
3. Restart Home Assistant.

Your settings in Lovelace remain intact after updates. Check the GitHub page for any new features or fixes regularly.