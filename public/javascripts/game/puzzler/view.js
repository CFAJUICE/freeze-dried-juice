/* global angular, createjs, juice, Ease */

(function () {
  'use strict';

  var puzzler  = angular.module('puzzler'),
      palettes = [{
        balls: [
          //'#FF9900', //orangish
          //'#99CC00', //greenish
          '#6699FF', //blueish
          '#FFFF33', //yellowish
          '#CC66CC', //purpleish
          '#CC6660', //pinkish
          '#009999'  //tealish
        ]
      }];
  puzzler.factory('PuzzlerView', ['Popover', 'Sounds', 'Util', 'GameOptions', ViewFactory]);

  //GameOptions
  function ViewFactory(Popover, Sounds, Util, GameOptions) {
    var gameWidth = 900;

    function View(game) {
      this.palette = palettes[Util.randomInt(0, palettes.length)];

      this.game = game;
      this.popovers = [];
      this.domEls = [];
      this.shapes = [];
      this.shapesInfo = [];
    }
    View.prototype.updateShape = function (shape, options) {
      var g = shape.children ? shape.children[0].graphics : shape.graphics;
      g.clear();
      g.setStrokeStyle(2);
      if (options.drawInfo.stroke) {
        g.beginStroke(options.drawInfo.stroke);
      } else {
        g.beginStroke(options.correct ? 'green' : 'orange');
      }
      g.beginFill(options.drawInfo.palette);
      g.drawCircle(0, 0, (options.drawInfo.radius));

      if (!shape.children) {
        return;
      }
      var crossOut = shape.children[1].graphics;
      crossOut.clear();
      if (options.correct === false) {
        shape.children[1].rotation = 45;

        crossOut.setStrokeStyle(2);
        crossOut.beginStroke('gray');
        crossOut.moveTo(0, -options.drawInfo.radius);
        crossOut.lineTo(0, options.drawInfo.radius);
        crossOut.endStroke();
      }
    };
    View.prototype._findInfo = function (content) {
      var shapeInfo = null;
      for (var i = 0; i < this.shapesInfo.length; i++) {
        var info = this.shapesInfo[i];
        if (content === info.content) {
          shapeInfo = info;
        }
      }
      return shapeInfo;
    };
    View.prototype.resetShapeByContent = function (content, shape) {
      var info = this._findInfo(content);
      if (info) {
        var newInfo = angular.extend({}, info);
        newInfo.shape = shape;
        this.resetShape(newInfo);
      }
    };
    View.prototype.resetShape = function (shape) {
      var shapeInfo;
      if (shape.shape) {
        shapeInfo = shape;
      }
      if (!shapeInfo) { return; }
      this.updateShape(shapeInfo.shape, {
        drawInfo: shapeInfo
      });
    };
    View.prototype.resetShapes = function () {
      var view = this;
      angular.forEach(this.shapesInfo, function (info) {
        view.resetShape(info);
      });
    };
    View.prototype.displayShape = function (info, callback) {//, parentEl) {
      var shape = new createjs.Shape(),
          view  = this,
          palette;
      var text;
      if (info.content) {
        text = textPiece(info.content.content, {
          fontFamily: 'Verdana',
          fontSize: '17px',
          color: 'black',
          zIndex: 1000,
          draggable: true
        });
        text.style.left = (info.domX || info.x) + 'px';
        text.style.top = (info.domY || info.y || 50) + 'px'; //otherwise we visibly start above the canvas and it looks strange
        text.setAttribute('answer-content', info.content.content);
        text.setAttribute('answer-id', info.content.id);
        if (GameOptions.perfTest) {
          text.style.display = 'none';
        }
        (document.querySelector('#game')).appendChild(text);

        view.domEls.push(text);
      }

      var radius = 0;
      if (text) {
        radius = text.offsetWidth / 2;
        if (radius < 25) {
          radius = 25;
        }
      }

      if (info.type === 'circle') {
        palette = this.palette.balls[Util.randomInt(0, this.palette.balls.length)];

        var g         = shape.graphics,
            stroke    = createjs.Graphics.getRGB(0,0,0),
            container = new createjs.Container(),
            crossOut  = new createjs.Shape();
        g.setStrokeStyle(2);
        g.beginStroke(stroke);
        g.beginFill(palette);
        g.drawCircle(0, 0, (radius));
        shape.cursor = 'pointer';

        crossOut.rotation = 45;

        container.addChild(shape);
        container.addChild(crossOut);
        this.game.stage.addChild(container);
        shape = container;

        if (info.x) { shape.x = info.x; }
        if (info.y) { shape.y = info.y; }

        this.shapesInfo.push({
          radius: radius,
          palette: palette,
          stroke: stroke,
          content: info.content ? text : null,
          shape: shape.children[0]
        });
      }

      this.shapes.push(shape);
      return {
        ui: shape,
        content: info.content ? text : null,
        radius: text ? radius : 0,
        palette: palette
      };
    };

    View.prototype.displayPlatform = function (left, platform, right) {
      this.leftSide = bitmapFill(this.game.getAsset('corner-left'), left.rectX, left.rectY, left.width, left.height);
      this.platform = bitmapFill(this.game.getAsset('platform'), platform.rectX, platform.rectY, platform.width, platform.height, 'repeat');
      this.rightSide = bitmapFill(this.game.getAsset('corner-right'), right.rectX, right.rectY, right.width, right.height);

      this.game.stage.addChild(this.leftSide, this.platform, this.rightSide);
      this.shapes.push(this.leftSide);
      this.shapes.push(this.platform);
      this.shapes.push(this.rightSide);

      this._updateBody(left.body, {ui: this.leftSide, type: 'rect'});
      this._updateBody(platform.body, {ui: this.platform, type: 'rect'});
      this._updateBody(right.body, {ui: this.rightSide, type: 'rect'});

      function bitmapFill(image, x, y, width, height, repeat) {
        var shape = new createjs.Shape();
        repeat = repeat || 'no-repeat';
        shape
          .graphics
          .clear()
          .beginBitmapFill(image, repeat)
          .drawRect(x, y, width, height);
        shape.set({alpha: 0});
        createjs.Tween.get(shape).to({alpha: 1}, 500);
        return shape;
      }
    };

    View.prototype.addUiToBody = function (body, info) {
      return this._updateBody(body, this.displayShape(info));
    };

    View.prototype._updateBody = function (body, shapeInfo) {
      var userData = body.GetUserData();

      var data = {
        ui: shapeInfo.ui,
        content: shapeInfo.content,
        type: shapeInfo.type,
        radius: shapeInfo.radius,
        drawInfo: shapeInfo.radius ? {
          radius: shapeInfo.radius,
          palette: shapeInfo.palette
        } : null
      };

      if (userData) {
        data.ui2 = shapeInfo.ui2;
        body.SetUserData(angular.extend(data, userData));
      } else {
        body.SetUserData(data);
      }

      return shapeInfo;
    };

    function textPiece(content, options) {
      var dom = document.createElement('div');

      dom.style.position = 'absolute';
      dom.style.zIndex = 2000;
      dom.style.display = 'inline-block';

      if (options.draggable) {
        dom.style.border = '1px solid transparent';
        dom.className = 'draggable';
      }

      dom.innerHTML = content;
      dom.className += ' text-piece';

      Object.keys(options).forEach(function (style) {
        dom.style[style] = options[style];
      });

      return dom;
    }

    View.prototype.getLocation = function (body) { //takes a ui object, or a box2d body
      var ui;
      if (body && body.GetUserData) {
        var userData = body.GetUserData();
        if (!userData) { return null; }
        ui = userData.ui;
      } else {
        ui = body;
      }

      if (!ui) {
        return {};
      }

      var canvas = this.game.stage.canvas;
      return {
        x: ui.x + canvas.getBoundingClientRect().left - 10,
        y: ui.y
      };
    };

    View.prototype.tempPopup = function (options) {
      options.className += ' game-popup no-arrow';
      options.remove = 'click';
      options.clickAnywhere = ('clickAnywhere' in options) ? options.clickAnywhere : true;
      this.popovers.push(Popover.show(options));
    };

    View.prototype.displayQuestion = function (content) {
      var questionAlign    = content.question_align || 'center',
          promptAlign      = content.equation_align || 'center',
          isPromptCentered = promptAlign === 'center';
      var header = textPiece(content.question, {
        fontFamily: 'Verdana',
        fontSize: '22px',
        color: '#1645CD',
        top: '60px',
        left: '10px',
        right: '10px',
        textAlign: questionAlign
      });

      document.querySelector('#game').appendChild(header);
      this.domEls.push(header);
      header.style.left = ((gameWidth - header.offsetWidth) / 2) + 'px';


      if (!content.equation) {
        return;
      }
      var text = textPiece(content.equation, {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#000'
      });
      document.querySelector('#game').appendChild(text);
      this.domEls.push(text);

      text.style.left = '0px';
      if (isPromptCentered) {
        text.style.left = (((gameWidth - text.offsetWidth) - 40) / 2) + 'px';
      } else {
        text.style.left = 40 + 'px';
        text.style.width = (gameWidth - 40 - 40) + 'px';
      }


      text.style.top = '120px';
      text.style.padding = '10px 20px';
      text.style.backgroundColor = 'rgba(255, 255, 255, .5)';
      text.style.borderRadius = '10px';
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
        //shape.graphics;
      });
      this.domEls.forEach(function (el) {
        el.style.opacity = 0;
      });
    };

    View.prototype.reset = function () {
      this.game.stage.removeAllChildren();
      this.game.stage.update();
      this.dismissPopups();

      this.shapes = [];
      this.domEls.forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
    };

    return View;
  }
})();