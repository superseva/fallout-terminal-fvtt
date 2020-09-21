class FalloutTerminal{

  static ACTIVATE_TERMINAL_CMD = '!_activate_terminal';
  static PASSWORD_CMD = '!pass';
  static PREV_SCREEN_CMD = '!_prev_terminal_screen';
  static SHOW_SCREEN_CMD = '!_show_terminal_screen';
  static VERSION = '1.1';

  static ASCII_TABLE = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`{|}~';
  static DEFAULT_BG_COLOR = '#000';
  static DEFAULT_BUTTON_COLOR = '#114422';
  static DEFAULT_TEXT_COLOR = '#22ff88';

  constructor() {
    this.curTerminal = {};
    this.nextItemId = 0;
    this.history = [];
    this.curScreenId;
  }


  /**
   * Activates a terminal by initializing its JSON and displaying the
   * first screen of the terminal.
   * @private
   * @param  {string} id
   */
  activateTerminal(_journalName) {

    Hooks.once('renderChatMessage', (message, html, data) => {
      this._checkChatMessage(message.data, html,data);
    });
    var json = this._getTerminalJson(_journalName);
    //console.log(json);
    if(json) {
      this._initTerminal(json);
      this._displayScreen(this.curTerminal._startId);
    }
  }

  /**
   * Parses a terminal's raw JSON from Journal Entity content.
   * @private
   * @param  {string} _journalName
   */
   _getTerminalJson(_journalName){
    //get the journal and the content
    var journal = game.journal.getName(_journalName );
    var text = $(journal.data.content).text();
    var _json = JSON.parse(text);
    return _json;
  }


  /**
   * Initializes the internal JSON for the terminal. Optimized for use
   * by the Roll20 macro system.
   * @private
   * @param  {Terminal} json
   */
   _initTerminal(json) {
    // Recursively create a map of each item in the terminal.
    this.curTerminal = {};
    this.nextItemId = 0;
    this.history = [];

    this._initTerminalScreens(json);
    //console.log(json);
    $.extend(this.curTerminal, {
      _locked: json.locked,
      _password: json.password,
      _attempts: json.attempts,
      _startId: json.id,
      _terminalName: json.name
    });

    //console.log(this.curTerminal);
  }

  /**
   * Initializes the IDs for the terminal screens.
   * @private
   * @param  {TerminalScreen} screen
   */
  _initTerminalScreens(screen) {
    // Assign the item an ID if it doesn't already have one.
    if(!screen.id) {
      screen.id = this.nextItemId;
      this.nextItemId++;
    }
    this.curTerminal[screen.id] = screen;

    // Recursively create the child items' IDs.
    screen.screenIds = [];
    if(screen.screens!=undefined){
      //console.log(screen.screens);
      var l = screen.screens.length;
      //console.log(screen.screens.length);

      for ( var i = 0; i < screen.screens.length; i++ ) {
        var child = screen.screens[i];

        if( (typeof child === "object" || typeof child === 'function') && (child !== null) )  {
          this._initTerminalScreens(child);
          screen.screenIds.push(child.id);
        }
        else{
          screen.screenIds.push(child);
        }
      }
    }
    delete screen.screens;
  }

  /**
   * Displays a terminal screen in the chat.
   * @private
   * @param  {(string|int)} id
   */
   _displayScreen(id) {
    var screen = this.curTerminal[id];
    this.curScreenId = id;

    var html = '<table>';
    html += '<thead><tr><th>' + this.curTerminal._terminalName + '</th></tr>';
    html += '</thead>';
    html += '<tbody>';
    html += '<tr><td>';
    if(screen)
      html += this._displayScreenContent(screen);
    else
      html += this._displayScreenContent('ERROR 0xFFFFF710\n"Data Corru:xsfkleg,, g364[735}3__' + id + '."');

     if(!this.curTerminal._locked){
       html += this._displayScreenButtons(screen);
    }

    html += '</td></tr></tbody></table>';
    this._sendChat('Fallout Terminal', html);

  }

  /**
   * Displays a command button for the terminal screen.
   * @param  {string} cmd
   * @param  {string} label
   * @return {string}
   */
  _displayScreenButton(cmd, label, id) {
    return '<button class="terminal-chat-button" data-label="'+label+'" data-screenid="'+id+'">'+ label +'</button>'
     // return '<a href="' + cmd + '" style="background: ' + this._getButtonColor() + '; border: none; color: ' + this._getTextColor() + '; margin: 0.2em 0; width: 95%;">' + label + '</a>';
  }
  _displayBackButton() {
    return '<div style="text-align:center;" class="terminal-back-button">BACK</div>';
     // return '<a href="' + cmd + '" style="background: ' + this._getButtonColor() + '; border: none; color: ' + this._getTextColor() + '; margin: 0.2em 0; width: 95%;">' + label + '</a>';
  }

  /**
   * Displays the navigation buttons for the screen.
   * @param  {TerminalScreen} screen
   */
  _displayScreenButtons(screen) {
    var prevScreenId = this.history[this.history.length-1];

    var html = '<div style="padding-top: 1em;" class="flexcol">';
    // html += '<p>SHOW_SCREEN_CMD'  + screen.name+'</p>';
    // html += '</div>';
    if(screen) {
      for(var i=0; i<screen.screenIds.length; i++){
        var id = screen.screenIds[i];
        var _screen = this.curTerminal[id];
        if(_screen){
          html += this._displayScreenButton(FalloutTerminal.SHOW_SCREEN_CMD + ' ' + id, _screen.name, id);
        }
      }
    }
    if(prevScreenId !== undefined){
      html += this._displayBackButton();
    }
    html += '</div>';
    return html;
  }

  /**
   * Produce the HTML content for a terminal screen.
   * @private
   * @param  {TerminalScreen} screen
   * @return {string}
   */
  _displayScreenContent(screen) {
    var html = '<div>';
    if(typeof screen === "string"){
      html += this._htmlNewlines(screen);
    }
    else if(this.curTerminal._locked) {
      if(!screen.attempts)
        html += this._htmlNewlines('TERMINAL LOCKED\n\nPLEASE CONTACT AN ADMINISTRATOR');
      else
        html += this._htmlNewlines('ENTER PASSWORD');
      //  html += this._htmlNewlines(this._displayScreenHacking());
    }
    else {
      html += this._htmlNewlines(screen.name + '\n\n' + (screen.content || ''));
    }
    html += '</div>';
    return html;
  }

  _displayScreenHacking(){

  }
  /**
   * Guesses the password for the terminal.
   * @param  {string} password
   */
  _guessPassword(password) {
    if(password === this.curTerminal._password)
      this.curTerminal._locked = false;
    else
      this.curTerminal._attempts--;
      this._displayScreen(this.curTerminal._startId);
  }

  /**
   * Replaces \n's with <br/>'s.
   * @param  {string} str
   * @return {string}
   */
  _htmlNewlines(str) {
    return str.replace(/\n/g, '<br/>');
  }

  async _sendChat(name, content){
    console.log("CREATING MESSAGE");
    await ChatMessage.create({ content: content });
    // Hooks.once('renderChatMessage', (message, html, data) => {
    //   this._checkChatMessage(message.data, html,data);
    // });

  }

  _onTerminalButtonScreen($el){
    console.log('ALOOOO');
    console.log($el.currentTarget.dataset.screenid);
    var id = $el.currentTarget.dataset.screenid;
    this.history.push(this.curScreenId);
    this._displayScreen(id);
  }
  _onTerminalButtonBack($el){
    var id = this.history.pop();
    this._displayScreen(id);
  }

  _checkChatMessage(msg, html,data){
    $(html).find(".terminal-chat-button").click(this._onTerminalButtonScreen.bind(this));
    $(html).find(".terminal-back-button").click(this._onTerminalButtonBack.bind(this));
    try {
      if(msg.content === FalloutTerminal.ACTIVATE_TERMINAL_CMD && msg.selected) {
        this._activateTerminal(msg.selected[0]._id);
      }
      if(msg.content.indexOf(FalloutTerminal.SHOW_SCREEN_CMD) === 0) {
        var args = msg.content.split(' ');
        var id = args[1];
        this.history.push(this.curScreenId);
        this._displayScreen(args[1]);
        //console.log(args[1]);
      }
      if(msg.content.indexOf(FalloutTerminal.PREV_SCREEN_CMD) === 0) {
        var id = this.history.pop();
        this._displayScreen(id);
      }
      if(msg.content.indexOf(FalloutTerminal.PASSWORD_CMD) === 0) {
        var args = msg.content.split(' ');
        var password = args.slice(1).join(' ');
        this._guessPassword(password);
      }
    }
    catch(err) {
      console.log('FALLOT TERMINAL ERROR: ' + err.message);
    }





  }

  // HELPERS
  _getButtonColor(){
    return FalloutTerminal.DEFAULT_BUTTON_COLOR;
  }
  _getTextColor(){
    return FalloutTerminal.DEFAULT_TEXT_COLOR;
  }


}
