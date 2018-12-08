module.exports = {
  register: register,
  samplePortName: 'storageGetItem'
};

const storageEventListenerPorts = [];

window.addEventListener('storage', function(storageEvent) {
  if (storageEvent.newValue === null) {
    storageEventListenerPorts.forEach(function(ports) {
      ports.storageOnKeyRemoved.send([
        storageEvent.key,
        storageEvent.oldValue
      ]);
    });
  } else if (storageEvent.oldValue === null) {
    storageEventListenerPorts.forEach(function(ports) {
      ports.storageOnKeyAdded.send([
        storageEvent.key,
        storageEvent.newValue
      ]);
    });
  } else {
    storageEventListenerPorts.forEach(function(ports) {
      ports.storageOnKeyChanged.send([
        storageEvent.key,
        storageEvent.oldValue,
        storageEvent.newValue
      ]);
    });
  }
});

/**
 * Subscribe the given Elm app ports to ports from the Elm LocalStorage ports module.
 *
 * @param  {Object}   ports  Ports object from an Elm app
 * @param  {Function} log    Function to log ports for the given Elm app
 */
function register(ports, log) {
  [
    // Mapped to Storage API: https://developer.mozilla.org/en-US/docs/Web/API/Storage
    { key: "storageGetItem"      , fun: storageGetItem },
    { key: "storageSetItem"      , fun: storageSetItem },
    { key: "storageRemoveItem"   , fun: storageRemoveItem },
    { key: "storageClear"        , fun: storageClear },
    // Not in Storage API
    { key: "storagePushToSet"    , fun: storagePushToSet },
    { key: "storageRemoveFromSet", fun: storageRemoveFromSet },
  ]
    .filter(subscribeObj => subscribeObj.key in ports)
    .forEach(subscribeObj => ports[subscribeObj.key].subscribe(subscribeObj.fun));

  // StorageEvent API
  storageEventListenerPorts.push(ports);

  log = log || function() {};

  function storageGetItem(key) {
    log('storageGetItem', key);
    const response = getLocalStorageItem(key);

    log('storageGetItemResponse', key, response);
    ports.storageGetItemResponse.send([key, response]);
  }

  function storageSetItem([key, value]) {
    log('storageSetItem', key, value);
    setLocalStorageItem(key, value);
  }

  function storageRemoveItem(key) {
    log('storageRemoveItem', key);
    window.localStorage.removeItem(key);
  }

  function storageClear() {
    log('storageClear');
    window.localStorage.clear();
  }

  // A Set is a list with only unique values. (No duplication.)
  function storagePushToSet([key, value]) {
    log('storagePushToSet', key, value);

    const item = getLocalStorageItem(key);
    const list = Array.isArray(item) ? item : [];

    if (list.indexOf(value) === -1) {
      list.push(value);
    }

    setLocalStorageItem(key, list);
  }

  function storageRemoveFromSet([key, value]) {
    log('storageRemoveFromSet', key, value);

    const list = getLocalStorageItem(key);

    if (!Array.isArray(list)) {
      log('storageRemoveFromSet [aborting; not a list]', key, value, list);
      return;
    }

    // Filter based on JSON strings in to ensure equality-by-value instead of equality-by-reference
    const jsonValue = JSON.stringify(value);
    const updatedSet = list.filter(item => jsonValue !== JSON.stringify(item));

    setLocalStorageItem(key, updatedSet);
  }
}

/**
 * Get a JSON serialized value from localStorage. (Return the deserialized version.)
 *
 * @param  {String} key Key in localStorage
 * @return {*}      The deserialized value
 */
function getLocalStorageItem(key) {
  try {
    return JSON.parse(
      window.localStorage.getItem(key)
    );
  } catch (e) {
    return null;
  }
}

/**
 * Set a value of any type in localStorage.
 * (Serializes in JSON before storing since Storage objects can only hold strings.)
 *
 * @param {String} key   Key in localStorage
 * @param {*}      value The value to set
 */
function setLocalStorageItem(key, value) {
  window.localStorage.setItem(key,
    JSON.stringify(value)
  );
}
