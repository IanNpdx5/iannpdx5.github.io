// The first two lines are optional, use if you want to enable logging
// const log = require('logToConsole');
// log('data =', data);
const setDefaultConsentState = require('setDefaultConsentState');
const updateConsentState = require('updateConsentState');
const getCookieValues = require('getCookieValues');
const callInWindow = require('callInWindow');
const gtagSet = require('gtagSet');
const JSON = require('JSON');
const COOKIE_NAME = 'cookies';
/*
 *   Splits the input string using comma as a delimiter, returning an array of
 *   strings
 */
const splitInput = (input) => {
  if (!input) return [];
  return input.split(',')
      .map(entry => entry.trim())
      .filter(entry => entry.length !== 0);
};
/*
 *   Processes a row of input from the default settings table, returning an object
 *   which can be passed as an argument to setDefaultConsentState
 */
const parseCommandData = (settings) => {
  const regions = splitInput(settings['region']);
  const granted = splitInput(settings['granted']);
  const denied = splitInput(settings['denied']);
  const commandData = {};
  if (regions.length > 0) {
    commandData.region = regions;
  }
  granted.forEach(entry => {
    commandData[entry] = 'granted';
  });
  denied.forEach(entry => {
    commandData[entry] = 'denied';
  });
  return commandData;
};
/*
 *   Called when consent changes. Assumes that consent object contains keys which
 *   directly correspond to Google consent types.
 */
const onUserConsent = (consent) => {
  const consentModeStates = {
    ad_storage: consent['adConsentGranted'] ? 'granted' : 'denied',
    ad_user_data: consent['adUserDataConsentGranted'] ? 'granted' : 'denied',
    ad_personalization: consent['adPersonalizationConsentGranted'] ? 'granted' : 'denied',
    analytics_storage: consent['analyticsConsentGranted'] ? 'granted' : 'denied',
    functionality_storage: consent['functionalityConsentGranted'] ? 'granted' : 'denied',
    personalization_storage: consent['personalizationConsentGranted'] ? 'granted' : 'denied',
    security_storage: consent['securityConsentGranted'] ? 'granted' : 'denied',
  };
  updateConsentState(consentModeStates);
};
/*
 *   Executes the default command, and sets up the consent update callback
 */
const main = (data) => {
  /*
   * Optional settings using gtagSet
   */
  gtagSet('ads_data_redaction', data.ads_data_redaction);
  gtagSet('url_passthrough', data.url_passthrough);
  // Set default consent state(s). Add optional chaining to safely handle cases
  // where defaultSettings might be null or undefined.
  data.defaultSettings?.forEach(settings => {
    const defaultData = parseCommandData(settings);
    // wait_for_update (ms) allows for time to receive visitor choices from the CMP
    defaultData.wait_for_update = 500;
    setDefaultConsentState(defaultData);
  });

  // Check if cookie is set and has values that correspond to Google consent
  // types. If it does, run onUserConsent().
  const cookieValues = getCookieValues(COOKIE_NAME);
  if (cookieValues && cookieValues.length > 0) {
    try {
      const settings = JSON.parse(cookieValues[0]);
      if (settings) {
        onUserConsent(settings);
      }
    } catch (e) {
      // Log an error if the cookie value is not valid JSON.
    }
  }
  /**
   *   Add event listener to trigger update when consent changes
   *
   *   References an external method on the window object which accepts a
   *   function as an argument. If you do not have such a method, you will need
   *   to create one before continuing. This method should add the function
   *   that is passed as an argument as a callback for an event emitted when
   *   the user updates their consent. The callback should be called with an
   *   object containing fields that correspond to the five built-in Google
   *   consent types.
   */
  callInWindow('addConsentListenerExample', onUserConsent);
};
main(data);
data.gtmOnSuccess();
