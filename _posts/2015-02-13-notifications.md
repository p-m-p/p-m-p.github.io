---
layout: post
title: Using the notification API
categories: javascript es6
---

I've been working with the [Notification API][notifications] this week and
wanted to write a quick post to demonstrate how to ask the user for permission
to send them notifications of events that are happening in your web application.
I was mostly inspired to do this after using the [Wunderlist][wunderlist] web
application which is a really nice piece of engineering and super useful too.

##Asking for permission
Before you can attempt to notify the user you must ask them to grant permission
for you web application to send them desktop notifications. Doing this must be
the result of some kind of user interation in the UI, most commonly a button
click.

```javascript
var btn = document.getElementById('enable-notifications');

btn.addEventListener('click', function (ev) {
  Notification.requestPermission(function (result) {
    if (result === 'granted') {
      // Setup the code to use notifications for in app events
    }

    // Do nothing
  });
}, false);
```

You don't want to ask the user everytime they visit your app so before doing
this you can check if the permissions have already been granted or denied.

```javascript
var permission = Notification.permission;
var btn;

var enableNotifications = function () {
  // code to setup app notifications
};

if (permission === 'granted') {
  enableNotifications();
}
else if (permission !== 'denied') {
  // Reveal a button in the UI to enabled notifications. Some kind of
  // instructional modal is good for this
  btn = document.getElementById('enable-notifications');

  btn.addEventListener('click', function (ev) {
    Notification.requestPermission(function (result) {
      if (result === 'granted') {
        enableNotifications();
      }

      // Hide the button/modal
    });
  }, false);
}
```

##Presenting the user with notifications
Once the user has granted the application permission you can create new
notifications. A notication is created using the `Notification` constructor
which takes a title and optional options object as parameters.

```javascript
var notification = new Notification('Hey! Mary sent you a message', {
  body: 'You need to phone your brother to see if he is still coming tonight!',
  tag: 'NOT-12',
  icon: 'http://example.com/images/notification.png'
});
```
You can listen for events on the created notifications and these consist of
`click`, `show`, `close` and `error`. You'll most commonly listen to the click
and close events to update the UI accordingly such as updating the page to
reflect the call to action made in a clicked notification.

```javascript
notification.addEventListener('click', function (ev) {
  var id = ev.target.tag; // Notification tag property

  // Fetch the item which triggered the notification and present it in the UI
}, false);

notification.addEventListener('close', function (ev) {
  var id = ev.target.tag; // Notification tag property

  // User isn't interested so take appropriate action
}, false);
```

As you'd imagine notifications only show when the user is away from the
browser window and you don't want to flood the users desktop with notifications
so it's good practice to re-use a tag for certain types of notification. For
instance if you have a chat application you may only want to show a single
notification for a room and update that notification when a new message is
received. It's also worth noting that some browsers will auto-hide the
notifications after a short interval.

```javascript
var notification = new Notification('Mary sent you a message', {
  body: 'Can you get a pint of milk on your way home?',
  tag: 'NOT-RM-12',
  icon: 'http://example.com/images/notification.png'
});

// Overwrites previous notification with the same tag
var notification = new Notification('Mary sent you a message', {
  body: 'We\'ve run out and I have to work late :\'(',
  tag: 'NOT-RM-12',
  icon: 'http://example.com/images/notification.png'
});
```

There's plenty of libraries that manage this process more robustly but this is
one of those APIs that just seems to work really nicely and feels super
intuitive. Enjoy!

[notifications]: https://developer.mozilla.org/en/docs/Web/API/notification
[wunderlist]: https://www.wunderlist.com
