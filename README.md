A [FoundryVTT](http://foundryvtt.com/) module to add the ability to ping on the map. 

Inspired by [Mörill's Pointer](https://gitlab.com/moerills-fvtt-modules/pointer) module, but I didn't like the pointer and only wanted the pings, and I wanted to learn module development anyway.



# Installation

## Recommended

1. Go to Foundry's Setup screen
1. Go to the "Add-On Modules" tab
1. Press "Install Module"
1. Paste `https://gitlab.com/foundry-azzurite/pings/raw/master/src/module.json` into the text field
1. Press "Install"

## Alternative

1. Download [this zip file](https://gitlab.com/foundry-azzurite/pings/raw/master/dist/pings.zip)
2. Extract it into the `<FoundryVTT directory>/resources/app/public/modules`-folder

# Features

Click and hold with a mouse button or press a keyboard key to perform a ping.

![example ping](./doc/ping.mp4)

Contains a default ping image but can be completely customized in the module settings.

![settings](./doc/settings.png)

# Module Author API

There is an API for module authors which can be accessed by doing either

```
Hooks.once('pingsReady', (pingsApi) => {
    // use pingsApi
});`
```
or `window.Azzu.Pings`.

Look for available methods by reading the [source](https://gitlab.com/foundry-azzurite/pings/blob/master/src/pings.js) (look for `class PingsAPI`).

# Contributing

All PRs welcome. Keep the formatting the same.
