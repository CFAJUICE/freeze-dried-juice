/* global angular, juice, createjs */
(function () {
  'use strict';

  var sorter   = angular.module('sorter'),
      palettes = [{
        background: {
          range: ['#355780', '#5881B2'],
          opacities: [0.2, 1]
        }
      }];
  sorter.factory('SorterView', ['Popover', 'TextParser', 'Util', 'Sounds', 'DomHelper', ViewFactory]);

  function ViewFactory(Popover, TextParser, Util, Sounds, DomHelper) {
    var NEWLINE_CHAR = '~';
    var styles = {
      game: {
        width: 900
      },
      question: {
        fontFamily: 'Verdana',
        fontSize: 20,
        fontColor: '#0D24F6',
        top: 60,
        left: 10,
        right: 10
      },
      promptImg: {
        maxHeight: 150,
        maxWidth: 860,
        left: 0,
        right: 0,
        margin: 'auto'
      },
      textPiece: {
        fontFamily: 'Verdana',
        fontSize: 22,
        fontColor: '#000',
        top: 50
      },
      positions: {
        promptImgOffset: 15,
        textTopOffset: 10,
        indentationAlignment: 40
      }
    };

    function View(game, containerEl) {
      this.palette = palettes[Util.randomInt(0, palettes.length)];

      this.game = game;
      this.containerEl = containerEl;
      this.sentenceChunks = [];
      this.popovers = [];
      this.shapes = [];
    }

    View.prototype.displayBuckets = function (platforms, splits, ends) {
      var shape, i;

      for (i = 0; i < ends.length; i++) {
        var end = ends[i];
        shape = new createjs.Shape();
        shape.graphics
          .clear()
          .beginBitmapFill(this.game.getAsset(i === 0 ? 'corner-left' : 'corner-right'), 'no-repeat')
          .drawRect(end.rectX, end.rectY, end.width, end.height);
        this.game.stage.addChild(shape);
        this.shapes.push(shape);
        this._updateBody(end.body, {ui: shape});
      }

      for (i = 0; i < platforms.length; i++) {
        var platform = platforms[i];

        shape = new createjs.Shape();
        shape.graphics
          .clear()
          .beginBitmapFill(this.game.getAsset('platform'), 'repeat')
          .drawRect(platform.rectX, platform.rectY, platform.width, platform.height);
        this.game.stage.addChild(shape);
        this.shapes.push(shape);
        this._updateBody(platform.body, {ui: shape});
      }

      for (i = 0; i < splits.length; i++) {
        var split = splits[i];

        shape = new createjs.Shape();
        shape.graphics
          .clear()
          .beginBitmapFill(this.game.getAsset('split'), 'no-repeat')
          .drawRect(split.rectX, split.rectY, split.width, split.height);
        this.game.stage.addChild(shape);
        this.shapes.push(shape);
        this._updateBody(split.body, {ui: shape});
      }
    };

    View.prototype.getLocation = function (body) { //takes a ui object, or a box2d body
      var ui;
      if (body.GetUserData) {
        var userData = body.GetUserData();
        if (!userData) { return null; }
        ui = userData.ui;
      } else {
        ui = body;
      }

      if (ui.x != undefined) {
        return {
          x: (body.GetPosition().x + body.GetUserData().fixtureWidth) * 30,
          y: body.GetPosition().y * 30
        };
      } else {
        return {
          x: (body.GetPosition().x + body.GetUserData().fixtureWidth) * 30,
          y: body.GetPosition().y * 30
        };
      }
    };

    View.prototype.tempPopup = function (options) {
      options.className += ' game-popup no-arrow';
      options.remove = 'click';
      options.clickAnywhere = true;
      this.popovers.push(Popover.show(options));
    };

    function textPiece(content, options) {
      var dom = document.createElement('div');

      dom.style.position = 'absolute';
      dom.style.zIndex = 1;
      dom.style.display = 'inline-block';
      dom.style.visibility = 'hidden';
      dom.style.opacity = 0;

      dom.style.overflow = 'hidden';
      dom.style.border = '1px solid transparent';
      if (options.draggable) {
        dom.className = 'word-chunk draggable';
      }

      dom.innerHTML = content + '<span class="cross-out"></span>';
      dom.className += ' break-line text-piece sorter-text';

      Object.keys(options).forEach(function (style) {
        dom.style[style] = options[style];
      });
      return dom;
    }

    View.prototype.displayBucketDescriptions = function (buckets) {
      if (!buckets) { return; }

      var top           = '515px',
          numberBuckets = buckets.length;
      for (var i = 0; i < numberBuckets; i++) {
        var bucket      = buckets[i],
            bucketWidth = styles.game.width / numberBuckets,
            left        = (bucketWidth * i) + 'px',
            text;
        text = _addBucket(this.containerEl, bucket.content, top, left, this.sentenceChunks);
        text.style.width = bucketWidth + 'px';
        Util.resizeText(text, {alignHoriz: true, maxFontSize: 22});
      }
    };

    function _addBucket(containerEl, sentence, top, left, sentenceChunks) {
      var text = textPiece(sentence, {
        fontFamily: 'Arial',
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#0D24F6',
        draggable: false
      });
      text.innerHTML = '<p>' + text.innerHTML + '</p>';

      //document.querySelector('#game').appendChild(text);
      containerEl.appendChild(text);

      text.style.fontWeight = 'bold';
      text.style.top = top;
      text.style.left = left;
      text.style.paddingTop = '3px';
      text.style.visibility = 'visible';
      text.style.opacity = 1;
      text.style.textAlign = 'center';
      text.style.maxHeight = '42px';

      sentenceChunks.push(text);

      return text;
    }

    View.prototype.displayQuestion = function (content) {
      var align = content.instructions_align || 'center';
      var text  = textPiece(content.instructions, {
        fontFamily: styles.question.fontFamily,
        //fontSize: styles.question.fontSize + 'px',
		fontSize: (content.instructions_font_size ||'20') + 'px',
        color: styles.question.fontColor,
        draggable: false,
        playable: false
      });


      text.className = 'text-piece';
      //document.querySelector('#game').appendChild(text);
      this.containerEl.appendChild(text);

      text.style.top = styles.question.top + 'px';
      text.style.left = styles.question.left + 'px';
      text.style.right = styles.question.right + 'px';
      text.style.visibility = 'visible';
      text.style.textAlign = align;
      text.style.opacity = 1;

      this.sentenceChunks.push(text);

      this.questionEl = text;
      if (content.prompt_img) {
        var questionHeight = DomHelper.height(this.questionEl),
            top            = styles.question.top + questionHeight;

        var el = DomHelper.createEl('img', {
          style: {
            position: 'absolute',
            maxHeight: styles.promptImg.maxHeight + 'px',
            maxWidth: styles.promptImg.maxWidth + 'px',
            top: top + 'px',
            left: styles.promptImg.left + 'px',
            right: styles.promptImg.right + 'px',
            margin: styles.promptImg.margin
          },
          attachTo: this.containerEl
        });
        el.src = 'data:image/png;base64, ' + content.prompt_img;
        this.sentenceChunks.push(el);
        this.promptImgEl = el;
      }
    };

    View.prototype.displayAnswerContent = function (question, appearRandomly) {
      var contents   = TextParser.parse(question.contents),
          answers    = question.answers,
          uiPieces   = [], i;

      var answerLookup = {};
      for (i = 0; i < answers.length; i++) {
        var answer = answers[i];
        answerLookup[answer.content] = answerLookup[answer.content] || [];
        answerLookup[answer.content].push(answer);
      }

      contents = this._cleanContents(contents, appearRandomly);
      var textTop = this._calculateTopFor('sentence'),
          calculatedHeight;
      for (i = 0; i < contents.length; i++) {
        var piece   = contents[i],
            header  = textPiece(piece.text, {
              fontFamily: styles.textPiece.fontFamily,
              fontSize: styles.textPiece.fontSize + 'px',
              color: styles.textPiece.fontColor,
              draggable: piece.isLive
            }),
            uiPiece = {
              text: header,
              draggable: piece.isLive
            };
        this.containerEl.appendChild(header);
        uiPieces.push(uiPiece);

        if (calculatedHeight === undefined) {
          //calculatedHeight = DomHelper.height(header);
          calculatedHeight = 33;
          textTop -= calculatedHeight;
        }

        header.style.top = textTop + 'px';
        header.style.visibility = 'visible';

        if (piece.text === NEWLINE_CHAR) {
          header.style.display = 'none';
        }

        if (answerLookup[piece.text]) {
          var foundAnswer = answerLookup[piece.text].splice(0, 1);
          if (foundAnswer.length) {
            header.setAttribute('data-answer-id', foundAnswer[0].id);
          }
        }
        header.setAttribute('data-answer-content', piece.text);
        this.sentenceChunks.push(uiPiece.text);
      }

      return uiPieces;
    };

    View.prototype.positionAnswerContent = function (uiPieces, appearRandomly) {
      var currentRow          = [],
          rows                = [currentRow],
          rowWidths           = [0],
          position;

      //create array entries for each line, setting up elements and width
      for (var i = 0; i < uiPieces.length; i++) {
        var uiPiece       = uiPieces[i],
            isNewlineChar = uiPiece.text.textContent === NEWLINE_CHAR,
            widthIndex    = rowWidths.length - 1;
        if ((rowWidths[widthIndex] + uiPiece.text.offsetWidth + styles.positions.indentationAlignment) > styles.game.width ||
            isNewlineChar) {
          currentRow = [];
          rows.push(currentRow);
          rowWidths.push(isNewlineChar ? 0 : uiPiece.text.offsetWidth + styles.positions.indentationAlignment);
          //rowWidths.push(isNewlineChar ? 0 : $(uiPiece.text).outerWidth(true) + styles.positions.indentationAlignment);
          if (!isNewlineChar) {
            currentRow.push(uiPiece);
          }
        } else {
          currentRow.push(uiPiece);
          rowWidths[widthIndex] += uiPiece.text.offsetWidth;
          //rowWidths[widthIndex] += $(uiPiece.text).outerWidth(true);
        }
      }

      var top = parseFloat(uiPieces[0].text.style.top) + styles.positions.textTopOffset;
      for (i = 0; i < rows.length; i++) {
        var currentRowWidth = rowWidths[i];
        if (rows.length === 1) {
          position = ((styles.game.width - currentRowWidth) / 2);
        } else {
          position = styles.positions.indentationAlignment;
        }

        for (var j = 0; rows[i] && j < rows[i].length; j++) {
          var row             = rows[i],
              uiEl            = row[j];

          var elWidth = uiEl.text.offsetWidth;
          //var elWidth = $(uiEl.text).outerWidth(true);
          DomHelper.modifyEl(uiEl.text, {
            style: {
              left: position + 'px',
              top: top + 'px',
              minWidth: elWidth + 'px'
            }
          });

          position += elWidth;
        }

        top += 40;
      }

      return uiPieces;
    };

    View.prototype.playSound = function (sound) {
      Sounds.play(sound);
    };

    View.prototype.dismissPopups = function () {
      this.popovers.forEach(function (popover) { popover(); });
      this.popovers.length = 0;
    };

    View.prototype.transition = function () {
      this.shapes.forEach(function (shape) {
        createjs.Tween.get(shape).to({alpha: 0}, 250, createjs.Ease.getPowIn(2.2));
      });
      this.sentenceChunks.forEach(function (el) {
        el.style.opacity = 0;
      });
    };

    View.prototype.reset = function () {
      var i, chunk;
      if (this.sentenceChunks) {
        for (i = 0; i < this.sentenceChunks.length; i++) {
          chunk = this.sentenceChunks[i];
          chunk.parentNode && chunk.parentNode.removeChild(chunk);
        }
        this.sentenceChunks = [];
      }

      if (this.containerEl) { //make sure clones are cleaned up
        var clones = this.containerEl.querySelectorAll('.word-chunk');
        for (i = 0; i < clones.length; i++) {
          chunk = clones[i];
          chunk.parentNode && chunk.parentNode.removeChild(chunk);
        }
      }

      this.game.stage.removeAllChildren();
      this.game.stage.update();
      this.dismissPopups();
    };

    View.prototype._calculateTopFor = function (area) {
      switch (area) {
        case 'sentence':
          var topOffset = DomHelper.height(this.questionEl) + parseInt(this.questionEl.style.top);
          if (this.promptImgEl) {
            topOffset += DomHelper.height(this.promptImgEl);// + styles.positions.promptImgOffset;
          }
          return topOffset;
        default:
          return -1;
      }
    };

    View.prototype._updateBody = function (body, shapeInfo) {
      var userData = body.GetUserData();
      if (userData) {
        body.SetUserData(angular.extend({
          ui: shapeInfo.ui
        }, userData));
      } else {
        body.SetUserData({
          ui: shapeInfo.ui
        });
      }
      return shapeInfo;
    };

    View.prototype._expandNewlines = function (contents) {
      //run through the values and split the newlines out even further
      //  if some text contains a newline, split that content up into more entries in the array
      for (var i = 0; i < contents.length; i++) {
        var content = contents[i];
        if (content.isLive) {
          continue;
        }

        if (content.text.indexOf(NEWLINE_CHAR) === -1) {
          continue;
        }

        var newlineSplitContent = splitWithDelimiter(content.text, NEWLINE_CHAR);
        contents.splice(i, 1); //remove what's currently there, because we're splitting it out
        for (var j = 0; j < newlineSplitContent.length; j++) {
          var newLineContent = newlineSplitContent[j];
          contents.splice(i, 0, { //add in the content
            isLive: false,
            text: newLineContent
          });

          i++;
        }
      }
      return contents;
    };

    //if it's blank, put an &nbsp;
    //if it's a tilde, make a new line
    //if it's randomize, make sure to remember where blanks and tildes were, then apply the other logic
    View.prototype._cleanContents = function (contents, appearRandomly) {
      contents = this._expandNewlines(contents);
      if (appearRandomly) {
        contents = this.randomizeValues(contents);
      }

      for (var i = 0; i < contents.length; i++) {
        if (contents[i].text.trim() === '' || !contents[i].isLive) {
          contents[i].text = contents[i].text.replace(/\s/g, '<span style="width: 3px; display: inline-block;">&nbsp;</span>');
        }
      }
      return contents;
    };

    View.prototype.randomizeValues = function (contents) {
      var length   = contents.length,
          newLines = [];
      for (var i = length - 1; i >= 0; i--) { //make sure any special characters stay where they were without getting randomized (~ for a newline, for instance)
        if (contents[i].text === NEWLINE_CHAR ||
          contents[i].text.trim() === '') {
          newLines.push([i, contents[i]]);
          contents.splice(i, 1);
        }
      }
      contents = Util.shuffle(contents.concat([]));

      length = newLines.length;
      for (i = length - 1; i >= 0; i--) {
        contents.splice(newLines[i][0], 0, newLines[i][1]);
      }

      return contents;
    };

    function splitWithDelimiter(string, delimiter) {
      var pieces  = [],
          i = 0,
          indexOf = string.indexOf(delimiter);
      while (indexOf !== -1) {
        if (indexOf === 0) {
          pieces.push(string.substring(0, 1));
          i = 1;
        } else {
          pieces.push(string.substring(i, indexOf));                          //grab the content before the delimiter
          pieces.push(string.substring(indexOf, indexOf + delimiter.length)); //grab the delimiter
          i = indexOf + delimiter.length;
        }

        indexOf = string.indexOf(delimiter, i);
      }

      if (i < string.length) {
        pieces.push(string.substring(i, string.length));
      }

      return pieces;
    }

    return View;
  }
})();