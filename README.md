A [FoundryVTT](http://foundryvtt.com/) module to add the ability to ping on the map. 

Inspired by [Mörill's Pointer](https://gitlab.com/moerills-fvtt-modules/pointer) module, but I didn't like the pointer and only wanted the pings, and I wanted to learn module development anyway.

<a href="https://ko-fi.com/azzu"><strong>Please consider supporting me on</strong><br /><img src="https://azzurite.tv/donate/ko-fi.png" height="40" /><img src="https://azzurite.tv/donate/or.png" height="40" /></a><a href="https://www.patreon.com/azzu"><img src="https://azzurite.tv/donate/patreon.png" height="40" /></a><a href="https://ko-fi.com/azzu"><img src="https://azzurite.tv/donate/fees.png" height="40" /></a>

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

Look for available methods by reading the [source](https://gitlab.com/foundry-azzurite/pings/-/blob/master/src/api.js) (all methods that are `export`ed).

# Contributing

All PRs welcome. Keep the formatting the same.
