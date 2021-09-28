/**
 * Handles sending of messages - i.e. outgoing messages - back to Slack, via Slack's Web API. See
 * also ./events.js, which handles incoming messages from subscribed events.
 *
 * TODO: This file should probably be renamed to 'slack.js' so it can handle all other requests to
 *       the Slack APIs rather than just sending.
 *
 * @see https://api.slack.com/web
 */

'use strict';

let slack, users, entusers;

/**
 * Injects the Slack client to be used for all outgoing messages.
 *
 * @param {WebClient} client An instance of Slack's WebClient as documented at
 *                           https://slackapi.github.io/node-slack-sdk/web_api and
 *                           implemented at
 *                           https://github.com/slackapi/node-slack-sdk/blob/master/src/WebClient.ts
 * @returns {void}
 */
const setSlackClient = ( client ) => {
  slack = client;
};

/**
 * Retrieves a list of all users in the linked Slack team. Caches it in memory.
 *
 * @returns {object} A collection of Slack user objects, indexed by the user IDs (Uxxxxxxxx).
 */
const getUserList = async() => {

  if ( users ) {
    return users;
  }

  console.log( 'Retrieving user list from Slack.' );

  users = {};
  let pageCount = 0;
  let usersCount = 0;
  let flag = '';
  do {
      // Max user limit is 1000 per page
      const userList = await slack.users.list({ cursor: flag, limit: 1000 });

      if ( ! userList.ok ) {
        throw Error( 'Error occurred retrieving user list from Slack.' );
      }

      for ( const user of userList.members ) {
        users[ user.id ] = user;
        usersCount++;
      }

      flag = userList.response_metadata.next_cursor;
      console.log("Next Flag: ", flag);
      pageCount++;
  } while (flag != '')

  console.log(usersCount, " users returened in ", pageCount, " pages. ");

  return users;

}; // GetUserList.

/**
 * Given a collection Slack user ID, returns a collection of Slack user IDs indexed by the
 * respective enterprise user IDs.
 *
 * @param {object} users  A collection of Slack user IDs
 * @returns {object} a collection of Slack user IDs indexed by the respective enterprise user IDs (Uxxxxxxxxxx).
 */
const getEntUserList = async ( users ) => {

   if ( entusers ) {
     return entusers;
   }
   entusers = {};

   var keys = Object.keys(users);
   for ( const userId of keys ) {
      entusers[ users[userId].enterprise_user.id ] = id
   }

   return entusers

}; // GetEntUserList

/**
 * Given a Slack user ID, returns the user's real name or optionally, the user's username. If the
 * user *does not* have a real name set, their username is returned regardless.
 *
 * @param {string} userId   A Slack user ID in the format Uxxxxxxxx.
 * @param {bool}   username Whether the username should always be returned instead of the real name.
 * @returns {string} The user's real name, as per their Slack profile.
 */
const getUserName = async( userId, username = false ) => {

  const users = await getUserList(),
        user = users[ userId ];

  if ( 'undefined' === typeof user ) {
     const entusers = await getEntUserList( users ),
          user = users[ entusers[ userId ] ];
     if ( 'undefined' == typeof user ) {
        return '(unknown)';
     }
     return username || ! user.profile.real_name ? user.name : user.profile.real_name;
  }

  return username || ! user.profile.real_name ? user.name : user.profile.real_name;

};

/**
 * Given a Slack user ID, returns the repective enterprise user ID.
 *
 * @param {string} userId   A Slack user ID in the format Uxxxxxxxx.
 * @returns {string}  The enterprise user ID
 */
const getEntUserId = async ( userId ) => {

   const users = await getuserList(),
         user = users[ userId ];

   if ( 'undefined' === typeof user ) {
      return userId;
   }

   console.log('Enterprise user ID: ' + user.enterprise_user.id);
   return user.enterprise_user.id;

};

/**
 * Sends a message to a Slack channel.
 *
 * @param {string|Object} text    Either message text to send, or a Slack message payload. See the
 *                                docs at https://api.slack.com/methods/chat.postMessage and
 *                                https://api.slack.com/docs/message-formatting.
 * @param {string}        channel The ID of the channel to send the message to. Can alternatively
 *                                be provided as part of the payload in the previous argument.
 * @return {Promise} A Promise to send the message to Slack.
 */
const sendMessage = ( text, channel ) => {

  let payload = {
    channel,
    text
  };

  // If 'text' was provided as an object instead, merge it into the payload.
  if ( 'object' === typeof text ) {
    delete payload.text;
    payload = Object.assign( payload, text );
  }

  return new Promise( ( resolve, reject ) => {
    slack.chat.postMessage( payload ).then( ( data ) => {

      if ( ! data.ok ) {
        console.error( 'Error occurred posting response.' );
        return reject();
      }

      resolve();

    });

  }); // Return new Promise.
}; // SendMessage.

module.exports = {
  setSlackClient,
  getUserList,
  getEntUserList,
  getUserName,
  getEntUserId,
  sendMessage
};
