---
layout: post
title:  "Generators and Iterators... Iterators..."
categories: javascript es6
---

So I finally got around to reading up on some of the new stuff in ES6 or
whatever it's called this week, [JavaScript 2015][javascript-2015]. There's some
pretty cool stuff being added to the language and I think that the future for
us JavaScript developers looks on the whole, pretty bright.
There was a particular combination of new features&mdash;I might add that these
are available in both Chrome and Firefox's mainstream builds today&mdash;that
sparked my interest and that is Symbols, Iterators and Generators.
On top of these we also have some nice new language features such as the
`for...of` loop which is much like the `for...in` but instead iterates over the
values of an object that conforms to the iterator protocol.

##Symbols
To quote MDN; [Symbols][symbol] are unique, immutable data types. Now if
you've ever worked with a language like Ruby then your first encouter of the
symbol syntax in JavaScript is a bit of a weird one but it all makes sense
reasonably quickly. Symbols are generally used to represent special object
properties which is seen in the Iterator protocol and other built in language
constructs but it's worth noting that most language constructs like the
for...in loop will ignore Symbol object properties. And rightly so.

##The iterator protocol
JavaScript objects can implement the [iterator protocol][iterator] to expose a
view of internal data. One thing I found with doing this without the use of
Generators is that it's all a little bit verbose. Having to return an object
for each iteration with the `value` and `done ` attributes feels clumsy to
implement.  Take a look by building an amazing new app to help with your
weekly shop!?

```javascript
// A shopping list will contain a list of items and as we go around the
// supermarket we can tick items off as we find them and add them to our basket
var ShoppingList = function (items) {
  this._items = items;
};

// When we find an item we tick it off the list and add it to our basket
ShoppingList.prototype.tickItemOff = function (item) {
  item.inBasket = true;
};

// When we iterate over the shopping list we are only interested in the items
// not currently in the basket. We do this by creating and returning our own
// iterator object
ShoppingList.prototype[Symbol.iterator] = function () {
  var items = this._items
    , index = 0;

  return {
    // Each call to next pulls the next item off if it exists and updates the
    // counter index
    next: function () {
      var nextItem;
      do { nextItem = items[index++]; }
      while (nextItem && nextItem.inBasket);
      return {value: nextItem, done: index > items.length};
    }
  };
};
```

Now it's not the worst syntax in the world but it's not something that looks
particularly natural either having to maintain an index for the iteration
ourselves in code. [Step up Generators][generator].

##Generators
Now again if you're a seasoned Ruby developer you'll be used to seeing some of
the langauge constructs around Generators and in some senses they're similar.
We pass off control flow using the `yield` keyword through which you can pass
out values and as it's JavaScript this opens up a lot of opportunity to do
some neat trickts like passing a modifier function as you would a ruby block.

```javascript
// A generator function is identified by the star after the function keyword on
// a lambda (anonymous function) and before the function name on named
// functions. In the generator we can iterate over the list of items and
// yield execution passing off each item we find which is not yet in the basket
ShoppingList.prototype.itemsNotInBasket = function* () {
  for (var item of this_items) {
    if (!item.inBasket) {
      yield item;
    }
  }
};

// Calling the generator function returns an iterable
for (var itemName of list.itemsNotInBasket()) {
  console.info(itemName);
}

// Or you can get reference to it and query it as you desire.
var it = list.itemsNotInBasket();
var item;

while (! (item = it.next()).done) {
  console.info(item.value.name);
}
```

As you can see a generator automagically returns an iterator. You can query
this iterator directly as I did in the second example or use `for...of`
to iterate over it. As generator functions return an iterator they make a
pretty good use case for implementing the iterator protocol in the shopping
list object. To do this now is as simple as calling the generator function and
returning the iterator received from it.

```javascript
ShoppingList.prototype[Symbol.iterator] = function () {
  return this.itemsNotInBasket();
};
```

I'm not overly keen on the raw iterator implementation but I do like the
power of generators. You can yield at different points in a generator function
when not doing basic collection style operations and you can incorporate
promises to make asynchronous code more manageable. I'm still to explore the
native promise implementation fully but I'm hoping you can incorporate them
with generators. I'll report back on that in the near future.

```javascript
var ShoppingList = function (items) {
  this._items = items;
};

ShoppingList.prototype.itemsNotInBasket = function* () {
  for (var item of this._items) {
    if (!item.inBasket) {
        yield item;
    }
  }
};

ShoppingList.prototype.shopForItems = function () {
  var jobs = [];

  for (var item of this) {
    jobs.push(this.browseForItem(item));
  }

  return Promise.all(jobs);
};

ShoppingList.prototype.browseForItem = function (item) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      (Math.random() < 0.1)? reject(item) : resolve(item);
    }, 1000);
  });
};

ShoppingList.prototype[Symbol.iterator] = function () {
  return this.itemsNotInBasket();
};

var list = new ShoppingList([
  { name: 'Bananas', price: 0.65 },
  { name: 'Snickers', price: 0.7 },
  { name: 'Sliced bread', price: 1.45 },
  { name: 'Hot dogs', price: 1.95 }
]);

list.shopForItems().then(
  function (items) {
    console.info(
      'Managed to buy ' +
      items.map(function (item) { return item.name; }).join(', ') +
      '. Winning! Enjoy your day folks');
  },
  function (item) {
    console.error('Failed to find ' + item.name);
  });
```

[javascript-2015]: https://esdiscuss.org/topic/javascript-2015
[symbol]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
[iterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/The_Iterator_protocol
[generator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*
