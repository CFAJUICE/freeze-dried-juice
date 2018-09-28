/* global angular, juice, Box2D */
/* jsHint ignore:constructor */
(function () {
  'use strict';

  var sorter = angular.module('sorter');
  sorter.factory('SorterPhysics', ['PhysicsInteraction', 'GameFeedback', 'Util', 'DomHelper', function (PhysicsInteraction, GameFeedback, Util, DomHelper) {
    var ANSWER_THRESHOLD = 340;

    var b2Vec2          = box2d.b2Vec2,
        b2AABB          = box2d.b2AABB,
        b2BodyDef       = box2d.b2BodyDef,
        b2Body          = box2d.b2Body,
        b2FixtureDef    = box2d.b2FixtureDef,
        b2World         = box2d.b2World,
        b2PolygonShape  = box2d.b2PolygonShape,
        //b2DebugDraw     = box2d.b2DebugDraw,
        b2MouseJointDef = box2d.b2MouseJointDef;
    //var b2Vec2          = Box2D.Common.Math.b2Vec2,
    //    b2AABB          = Box2D.Collision.b2AABB,
    //    b2BodyDef       = Box2D.Dynamics.b2BodyDef,
    //    b2Body          = Box2D.Dynamics.b2Body,
    //    b2FixtureDef    = Box2D.Dynamics.b2FixtureDef,
    //    b2World         = Box2D.Dynamics.b2World,
    //    b2PolygonShape  = Box2D.Collision.Shapes.b2PolygonShape,
    //    b2DebugDraw     = Box2D.Dynamics.b2DebugDraw,
    //    b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;
    var pxPerMeter      = 30;   // 30 pixels = 1 meter. Box2D uses meters and we use pixels.
    var shouldDrawDebug = false;
    var gameHeightInPx = 505,
        gameWidthInPx  = 900;

    function Physics(game, view) {
      this.game = game;
      this.view = view;
      this.bodiesToRemove = [];
      this.bodies = [];
      this.world = new b2World(/*gravity= */new b2Vec2(0, 50), /*allow sleep= */ true);

      PhysicsInteraction.mixin(this);

      var self = this;
      self.getBodyAtMouse = function () {
        self.mousePVec = new b2Vec2(self.mouseX, self.mouseY);
        var aabb = new b2AABB();
        //aabb.lowerBound.Set(self.mouseX - 0.001, self.mouseY - 0.001);
        //aabb.upperBound.Set(self.mouseX + 0.001, self.mouseY + 0.001);

        aabb.lowerBound.x = self.mouseX - 0.001;
        aabb.lowerBound.y = self.mouseY - 0.001;
        aabb.upperBound.x = self.mouseX + 0.001;
        aabb.upperBound.y = self.mouseY + 0.001;

        // Query the world for overlapping shapes.

        self.selectedBody = null;
        self.world.QueryAABB(getBodyCB, aabb);

        if (self.selectedBody) {
          var userData = self.selectedBody.GetUserData();
          if (userData && (userData.isScoringPlatform || userData.isBoundary || !userData.isScorable)) {
            //
          } else {
            //if (self.selectedBody.GetType() == b2Body.b2_staticBody) {
            if (self.selectedBody.GetType() == box2d.b2BodyType.b2_staticBody) {
              var clone = self._createClone(userData.ui);

              userData.ui.className += ' selected'; //!JP this should be moved into the view - doesn't make sense here

              var selectedData = self.selectedBody.GetUserData();
              self.selectedBody.SetUserData(angular.extend(selectedData, {
                originalX: parseFloat(selectedData.ui.style.left),
                originalY: parseFloat(selectedData.ui.style.top),
                box2dX: self.selectedBody.GetPosition().x,
                box2dY: self.selectedBody.GetPosition().y,
                clone: clone
              }));


              //self.selectedBody.SetType(b2Body.b2_dynamicBody);
              self.selectedBody.SetType(box2d.b2BodyType.b2_dynamicBody);
              self.selectedBody.GetFixtureList().SetSensor(false);
            }
          }
        }

        return self.selectedBody;
      };

      function getBodyCB(fixture) {
        if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), self.mousePVec)) {
          self.selectedBody = fixture.GetBody();
          fixture.SetSensor(false);
          return false;
        }
        return true;
      }
      this.addInteractions();
    }
    Physics.prototype._createClone = function (el) {
      var clone = el.cloneNode(/*deep=*/ true);
      clone.className = 'word-chunk clone'; //Note, becoming 'word-chunk' not 'word-chunk draggable' !JP Need to move to view
      clone.style.opacity = 0.25;
      //document.querySelector('.modal-content').appendChild(clone);
      this.view.containerEl.appendChild(clone);
      this.view.sentenceChunks.push(clone); //!JP needs to move to view
      return clone;
    };
    Physics.prototype._removeClone = function (clone) {
      this.view.sentenceChunks.splice(this.view.sentenceChunks.indexOf(clone), 1);
      clone.parentNode && clone.parentNode.removeChild(clone);
    };
    Physics.prototype._trackBody = function (body) {
      this.bodies.push(body);
    };
    Physics.prototype.createWorld = function () {
      //this.world = world;
      this.balls = [];
    };

    Physics.prototype.spawnSentence = function (content, startingState) {
      var bodyDef = new b2BodyDef,
          fixDef  = new b2FixtureDef;

      var objects = this.view.displayAnswerContent(content, content.appearRandomly), //display answers without mathjax
          answers = content.answers,
          lookup  = {},
          startingStateLookup = {},
          physics = this,
          view    = this.view;
      Util.runMathJax(initAfterMathJax); //we don't know the real width until mathjax has run
      function initAfterMathJax() {
        view.positionAnswerContent(objects, content.appearRandomly); //now that mathjax is done, determine width and position
        view.positionAnswerContent(objects, content.appearRandomly); //now that mathjax is done, determine width and position

        answers.forEach(function (answer) {
          lookup[answer.id] = answer;
        });

        if (startingState) {
          angular.forEach(startingState, function (state) {
            if (!state.id) { return; }
            startingStateLookup[state.id] = startingStateLookup[state.id] || [];
            startingStateLookup[state.id].push(state);
          });
        }

        for (var i = 0; i < objects.length; i++) {
          var object = objects[i];
          var startingStateObject = startingStateLookup[object.text.getAttribute('data-answer-id')];
          if (startingStateObject) {
            startingStateObject = startingStateObject.splice(0, 1)[0];
          }

          fixDef.density = 1.5;
          fixDef.friction = 0.2;
          fixDef.restitution = 0.1;

          //bodyDef.type = b2Body.b2_staticBody;
          bodyDef.type = box2d.b2BodyType.b2_staticBody;

          var left = parseInt(object.text.style.left),
              top  = parseInt(object.text.style.top);

          var width = $(object.text).width() / 2;
          var height = $(object.text).height() / 2;
          left = $(object.text).position().left + width;

          bodyDef.position.x = (left) / (pxPerMeter);
          bodyDef.position.y = (top) / (pxPerMeter);
          fixDef.shape = new b2PolygonShape();
          fixDef.shape.SetAsBox(width/(pxPerMeter), (height/pxPerMeter));
          fixDef.isSensor = true;

          var ball = physics.world.CreateBody(bodyDef);
          ball.CreateFixture(fixDef);
          physics.balls.push(ball);

          physics._trackBody(ball); //for reset cleanup

          if (startingStateObject && startingStateObject.isLastFeedback) {
            physics.view.tempPopup({
              status: startingStateObject.lastFeedback.correct ? 'correct' : 'incorrect',
              title: startingStateObject.lastFeedback.title,
              isCenter: true,
              content: startingStateObject.lastFeedback.content,
              remove: 'click',
              x: 450,
              y: 300,
              attachTo: document.querySelector('.modal-content')
            });
          }

          var userData      = ball.GetUserData(),
              answerContent = object.text.getAttribute('data-answer-content'), //need to use the content from before it was parsed by MathJax
              answerId      = object.text.getAttribute('data-answer-id');
          if (userData) {
            ball.SetUserData(angular.extend({
              ui: object.text,
              content: answerContent,
              answer: lookup[answerId],
              isScorable: object.draggable,
              answers: answers,
              startingState: startingStateObject
            }, userData));
          } else {
            ball.SetUserData({
              ui: object.text,
              content: answerContent,
              answer: lookup[answerId],
              isScorable: object.draggable,
              answers: answers,
              startingState: startingStateObject
            });
          }
        }
      }
    };
    Physics.prototype.scoringPlatform = function () {
      return this.scoringPlatformBody;
    };
    Physics.prototype.createScoringPlatform = function (buckets) {
      var physics         = this,
          numberEnds      = 2,
          numberSplits    = buckets.length - 1,
          numberPlatforms = buckets.length,

          splitWidth      = 11,
          splitHeight     = 180,
          splitY          = 376,

          endWidth        = splitWidth,
          endHeight       = 218,
          endY            = 405,

          widthMinusEnds  = gameWidthInPx - (splitWidth * numberEnds),
          platformWidth   = widthMinusEnds / numberPlatforms,
          platformHeight  = 46,
          platformY       = gameHeightInPx - 16,

          leftEnd         = createPlatformPiece(endWidth / 2,               endY, endWidth, endHeight, true),
          rightEnd        = createPlatformPiece(gameWidthInPx - (endWidth / 2), endY, endWidth, endHeight, true),

          platforms       = [],
          splits          = [],
          ends            = [leftEnd, rightEnd];
      for (var i = 0; i < numberPlatforms; i++) {
        var platform, split;

        var dividedBy = numberPlatforms * 2,
            multBy    = 1 + (i * 2); //i = 0 -> 1 || i = 1 -> 3 || i = 2 -> 5 || i = 3 -> 7
                                     //4 positions -> 1 + 3
                                     //6 positions -> 1 + 3 + 5
                                     //8 positions -> 1 + 3 + 5 + 7
        var platformX = ((widthMinusEnds / dividedBy) * multBy) + endWidth;
        platform = createPlatformPiece(
          ///*x=*/((widthMinusEnds / dividedBy) * multBy) + endWidth,
          /*x=*/platformX,
          /*y=*/platformY,
          /*width=*/platformWidth,
          /*height=*/platformHeight,
          /*isBoundary=*/false,
          /*position=*/i === 0 ? 'left' : 'right',
          ///*leftX=*/i > 0 ? ((gameWidthInPx / dividedBy) * (multBy - 1)) : splitWidth,
          /*leftX=*/i > 0 ? platformX - (platformWidth / 2) : splitWidth,
          /*data=*/buckets[i]
        );
        platforms.push(platform);

        if (i !== (numberPlatforms - 1)) { //numberOfPlatforms = 3 //
          split = createPlatformPiece(
            ///*x=*/((gameWidthInPx / numberPlatforms) * (i + 1)),
            /*x=*/((platformWidth) * (i + 1)) + endWidth,
            /*y=*/splitY,
            /*width=*/splitWidth,
            /*height=*/splitHeight,
            /*isBoundary=*/true
          );
          splits.push(split);
        }
      }

      this.view.displayBuckets(platforms, splits, ends);
      if (numberPlatforms === 2) {
        this.scoringPlatformBody = {
          left: null,
          right: null
        };
        this.scoringPlatformBody.left = platforms[0].body;
        this.scoringPlatformBody.right = platforms[1].body;
      } else {
        this.scoringPlatformBody = {
          left: null,
          middle: null,
          right: null
        };
        this.scoringPlatformBody.left = platforms[0].body;
        this.scoringPlatformBody.middle = platforms[1].body;
        this.scoringPlatformBody.right = platforms[2].body;
      }

      function createPlatformPiece(x, y, width, height, isBoundary, position, leftX, data) {
        var bodyDef          = new b2BodyDef,
            fixDef           = new b2FixtureDef,
            widthFromCenter  = width / 2,
            heightFromCenter = height / 2;

        //bodyDef.type = b2Body.b2_staticBody;
        bodyDef.type = box2d.b2BodyType.b2_staticBody;
        bodyDef.position.x = x / pxPerMeter;
        bodyDef.position.y = y / pxPerMeter;
        bodyDef.angle = 0;
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(widthFromCenter / pxPerMeter, heightFromCenter / pxPerMeter);

        var body = physics.world.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        body.SetUserData({
          isBoundary: isBoundary,
          isScoringPlatform: isBoundary ? false : true,
          position: position ? position : undefined,
          data: data ? data : undefined,
          leftX: leftX === undefined ? undefined : leftX, //X in Box2d starts from the center and expands out in both directions,
                                                          //  where in the browser we're used to it starting at the left and expanding to the right
          fixtureWidth: widthFromCenter / pxPerMeter,
          fixtureHeight: heightFromCenter / pxPerMeter
        });
        physics._trackBody(body); //for reset cleanup

        return {
          rectX: 0,
          rectY: 0,
          height: height,
          width: width,
          body: body
        };
      }
    };

    Physics.prototype.createBoundaries = function () {
      var physics = this;
      createBoundary((gameWidthInPx + 10), gameHeightInPx, 10, 2000); //right wall
      createBoundary((-10), gameHeightInPx, 10, 2000); //left wall
      createBoundary(0, -10, 2000, 10); //ceiling

      function createBoundary(x, y, width, height) {
        var bodyDef = new b2BodyDef;
        var fixDef = new b2FixtureDef;
        //bodyDef.type = b2Body.b2_staticBody;
        bodyDef.type = box2d.b2BodyType.b2_staticBody;
        bodyDef.position.x = x / pxPerMeter;
        bodyDef.position.y = y / pxPerMeter;

        bodyDef.angle = 0;
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(width / pxPerMeter, height / pxPerMeter);
        var body = physics.world.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        body.SetUserData({isBoundary:true}); // distinguish this object from others.
        physics._trackBody(body); //for reset cleanup
      }
    };
    Physics.prototype.createRound = function (gameData, startingState) {
      this.createScoringPlatform(gameData.buckets);

      this.createBoundaries();
      this.setupContactListener();
      this.spawnSentence(gameData, startingState);
    };

    Physics.prototype._uiIsIncorrect = function (ui) {
      return !!(ui && ui.className && ui.className.indexOf && ui.className.indexOf('incorrect') !== -1);
    };

    Physics.prototype.checkAnswers = function (opts) { // opts = {currentGame, showPopup, wording, title, userData, correct, popupX, where}
      if (!opts) {
        opts = {};
      }

      var currentGame = opts.currentGame || this.game,
          userData = opts.userData || this.world.GetBodyList().GetUserData(),
          startingState = userData && userData.startingState,
          showPopup = opts.showPopup || false,
          wording = opts.wording || '',
          title = opts.title || '',
          correct = opts.correct || false,
          popupX = opts.popupX || 450,
          where = opts.where || 300,
          answersWithBuckets = [];

      angular.forEach(currentGame.content.answers, function (answer) {
        if (answer.bucket) {
          answersWithBuckets.push(answer);
        }
      });

      if (Object.keys(this.answered).length === answersWithBuckets.length) { //have we answered everything?
        var answers    = answersWithBuckets,
            allCorrect = true;
        for (var i = 0; i < answers.length; i++) {
          if (!this.answered[answers[i].id] || !this.answered[answers[i].id].correct) {
            allCorrect = false;
            break;
          }
        }
        currentGame.answerStatus(allCorrect ? 'correct' : 'incorrect');

        if (currentGame.answerStatus() === 'correct') {
          showPopup = true;
          correct = true;
          title = GameFeedback.correct();
          wording = currentGame.content.general_correct;
          !startingState && currentGame.recordCurrentAnswers();
        }
      } else {
        if (opts.correct != undefined) {
          currentGame.answerStatus(correct ? 'progress' : 'incorrect');
        }
      }


      if (showPopup) {
        this.view.dismissPopups();
        !(userData && userData.showAnswers) && this.view.tempPopup({
          status: correct ? 'correct' : 'incorrect',
          title: title,
          isCenter: true,
          content: wording,
          remove: 'click',
          feedbackSuccess: allCorrect,
          x: currentGame.answerStatus() === 'correct' ? 450 : popupX,
          y: currentGame.answerStatus() === 'correct' ? 300 : where,
          attachTo: document.querySelector('.modal-content')
        });
      }
    };

    Physics.prototype.update = function () {
      var self = this,
          mouseDownBody;
      if (self.isMouseDown && (!self.mouseJoint)) {
        self.view.dismissPopups();
      }

      if (self.isMouseDown && (!self.mouseJoint)) {
        mouseDownBody = self.getBodyAtMouse();
        if (mouseDownBody) {
          self.lastBody = mouseDownBody;

          var firstMouseDownData = mouseDownBody.GetUserData();
          if (firstMouseDownData &&
              this._uiIsIncorrect(firstMouseDownData.ui)) {
            firstMouseDownData.dockable = true;
          }
        }
      }

      if (self.isMouseDown && (!self.mouseJoint)) {
        if (mouseDownBody) {
          var md = new b2MouseJointDef();
          //md.bodyA = self.world.GetGroundBody();
          //md.bodyA = self.world.GetGroundBody();

          var bodyADef    = new b2BodyDef;
          //bodyADef.type = b2Body.b2_staticBody;
          bodyADef.type = box2d.b2BodyType.b2_staticBody;
          md.bodyA = self.world.CreateBody(bodyADef);
          //bodyADef.position.x = x / pxPerMeter;
          //bodyDef.position.y = y / pxPerMeter;
          //bodyDef.angle = 0;
          //fixDef.shape = new b2PolygonShape();
          //fixDef.shape.SetAsBox(width / pxPerMeter, height / pxPerMeter);
          //var body = physics.world.CreateBody(bodyDef);





          md.bodyB = mouseDownBody;
          //md.target.Set(self.mouseX, self.mouseY);
          md.target.x = self.mouseX;
          md.target.y = self.mouseY;

          md.collideConnected = true;
          md.maxForce = 1000.0 * mouseDownBody.GetMass(); //300
          self.mouseJoint = self.world.CreateJoint(md);
          mouseDownBody.SetAwake(true);
          mouseDownBody.SetActive(true);
        }
      }

      if (self.mouseJoint) {
        window.ignoreClick = true;

        if (self.isMouseDown) {
          self.mouseJoint.SetTarget(new b2Vec2(self.mouseX, self.mouseY));

          if (self.lastBody) {
            var clone = self.lastBody.GetUserData().clone;

            var lastBodyData = self.lastBody.GetUserData();
            if (clone && lastBodyData.dockable) {
              var ui = self.lastBody.GetUserData().ui;
              if (DomHelper.elementsOverlap(clone, ui)) {
                self.lastBody.GetUserData().cloneOpacity = clone.style.opacity;
                self.lastBody.GetUserData().cloneBackgroundColor = clone.style.backgroundColor;
                clone.style.backgroundColor = 'black';
                self.overlapped = true;
              }
              else {
                //
                //When you snap in, immediately move the physics body but transition the object manually using css
                //
                clone.style.opacity = '.6 !important';
                clone.style.backgroundColor = '#5D6AAE';
                clone.style.color = 'black';
                self.overlapped = false;
              }
              if (clone.className.indexOf('hvr-ripple-out') === -1) {
                clone.className += ' hvr-ripple-out';
              }
            }
          }
        } else {
          window.ignoreClick = false;

          if (self.lastBody) {
            if (self.lastBody.GetUserData().clone) {
              self.lastBody.GetUserData().clone.className = self.lastBody.GetUserData().clone.className.replace(' hvr-ripple-out', '');
              self.lastBody.GetUserData().clone.style.opacity = '.6 !important';
              self.lastBody.GetUserData().clone.style.backgroundColor = 'transparent';
              self.lastBody.GetUserData().clone.style.color = 'black';
              if (self.overlapped) {
                self._resetBody(self.lastBody);
              }

              self.lastBody = null;
              self.overlapped = false;
            }
          }
          self.world.DestroyJoint(self.mouseJoint);
          self.mouseJoint = null;
        }
      }


      this.world.Step(1/60, 10, 10);
      if (shouldDrawDebug) {
        this.world.DrawDebugData();
      }
      this.world.ClearForces();

      var body = this.world.GetBodyList(), shape, userData, text, position;
      while (body) {
        userData = body.GetUserData();
        shape = userData && userData.ui;
        text = userData && userData.content;
        var startingState = userData && userData.startingState;


        if (shape) {

          position = body.GetWorldCenter(); //http://gamedev.stackexchange.com/questions/26193/box2d-difference-between-worldcenter-and-position
          if (startingState && startingState.runNow) {
            delete userData.startingState;
            position = {
              x: startingState.x / pxPerMeter,
              y: startingState.x / pxPerMeter
            };
            userData.passedThreshold = true; //so we don't trigger the answer alerts
            body.SetPosition(new b2Vec2(startingState.x / pxPerMeter, startingState.y / pxPerMeter));
            body.SetAngle(startingState.angle);
          } else if (startingState) {
            startingState && (startingState.runNow = true);
          }


          if (shape.x != undefined) {
            shape.rotation = Util.rad2Deg(body.GetAngle());

            if (Math.round(shape.rotation) !== 0) {
              shape.x = (userData.leftX !== undefined ? userData.leftX : (position.x + userData.fixtureWidth) * pxPerMeter); //use provided leftX instead of calculating it
            } else {
              shape.x = (userData.leftX !== undefined ? userData.leftX : (position.x - userData.fixtureWidth) * pxPerMeter); //use provided leftX instead of calculating it
            }

            //shape.y = (position.y) * pxPerMeter;
            shape.y = (position.y - userData.fixtureHeight) * pxPerMeter;



          } else {
            var width = $(shape).width() / 2;
            var height = $(shape).outerHeight(true);

            if (shape.style.opacity == 0) {
              shape.style.opacity = 1;
            }

            shape.style.left = ((position.x * pxPerMeter) - (width)) + 'px';
            shape.style.top = ((position.y * pxPerMeter) + (height)) + 'px';

            if (startingState && startingState.runNow) {
              shape.className = startingState.className;
            }


            if (startingState) {
              continue;
            }


            //!JP Move all of this logic into the game object
            //store what's been answered so far, and see if it's everything
            var where           = parseInt(shape.style.top, 10),
                x               = parseInt(body.GetPosition().x * pxPerMeter, 10),
                answerThreshold = ANSWER_THRESHOLD,
                addingAnswer    = userData.isScorable && where > answerThreshold && !userData.passedThreshold,
                removingAnswer  = userData.passedThreshold && where <= answerThreshold,
                answerId;
            self.answered = self.answered || {};


            if (addingAnswer || removingAnswer) { //get answerId
              var answerID = userData.answer.id;
              for (var i = 0; i < userData.answers.length; i++) {
                if (userData.answers[i].id == answerID) {
                  answerId = userData.answers[i].id;
                }
              }
            }


            if (addingAnswer && body.IsActive()) {
              var scoringPlatform = this.scoringPlatform();
              var left   = this.view.getLocation(scoringPlatform.left),
                  middle = scoringPlatform.middle ? this.view.getLocation(scoringPlatform.middle) : null,
                  right  = this.view.getLocation(scoringPlatform.right);

              var popupX  = -1,
                  title   = '',
                  wording = '',
                  bucket;
              if (middle) {
                if (x > left.x && x < middle.x) {
                  popupX = middle.x - (scoringPlatform.middle.GetUserData().fixtureWidth * pxPerMeter);
                  bucket = scoringPlatform.middle.GetUserData().data;
                } else if (x > middle.x) {
                  popupX = right.x - (scoringPlatform.right.GetUserData().fixtureWidth * pxPerMeter);
                  bucket = scoringPlatform.right.GetUserData().data;
                } else {
                  popupX = left.x - (scoringPlatform.left.GetUserData().fixtureWidth * pxPerMeter);
                  bucket = scoringPlatform.left.GetUserData().data;
                }
              } else {
                if (x > left.x) {
                  popupX = right.x - (scoringPlatform.right.GetUserData().fixtureWidth * pxPerMeter);
                  bucket = scoringPlatform.right.GetUserData().data;
                } else {
                  popupX = left.x - (scoringPlatform.left.GetUserData().fixtureWidth * pxPerMeter);
                  bucket = scoringPlatform.left.GetUserData().data;
                }
              }

              var content = userData.content,
                  correct = false;
              for (var i = 0; i < userData.answers.length; i++) {
                if (userData.answers[i].content == content) {
                  if (bucket.id == userData.answers[i].bucket) {
                    title = GameFeedback.correct();
                    wording = 'Keep going!';
                    correct = true;
                  } else {
                    title = GameFeedback.incorrect();
                    wording = this.game.content.general_incorrect;
                  }
                  break;
                }
              }

              if (!correct) {
                title = GameFeedback.incorrect();
                var possibleWording = this.game.findWording(answerId, bucket.id);
                if (possibleWording) {
                  wording = this.game.findWording(answerId, bucket.id);
                }

                !startingState && this.view.playSound(juice.sounds.incorrect);
              } else {
                !startingState && this.view.playSound(juice.sounds.correct);
              }

              self.answered[answerId] = {
                body: body,
                correct: correct
              };

              //feedback message data
              this.lastFeedback = {
                title: title,
                //content: correct ? this.game.content.general_correct : wording,    //!PM to fix feedback message (see below)
				content: wording,
                id: userData.answer.id,
                correct: correct
              };
              userData.feedbackMessage = wording;
 
              //!PM following code to set correct feedback if all questions answered correctly
              var activeAnswers = function( uda) {
                 var count = 0;
				 $.each(uda, function(k, v) {
                   if (v.bucket) {
					   count = count + 1;
                   }
                 });
				 return count;
              }
           
			  var lfCorrect = true, count = 0;
              $.each(self.answered, function(k, v) {
                 count = count + 1;
                 if (!v.correct){
                   lfCorrect = false;
                 }
			  });
			  if (lfCorrect && count == activeAnswers(userData.answers)) {
				  this.lastFeedback.content = this.game.content.general_correct;
			  }
              // end of last feedback code


              body.SetUserData(angular.extend(userData, {
                passedThreshold: true
              }));


              
              userData.ui.className = userData.ui.className.replace(/correct|incorrect/g, '') + ' ' + (correct ? 'correct' : 'incorrect');




              this.checkAnswers({
                currentGame: self.game,
                showPopup: true,
                wording: wording,
                title: title,
                userData: userData,
                correct: correct,
                popupX: popupX,
                where: where
              });

            } else if (removingAnswer && body.IsActive()) {
              body.SetUserData(angular.extend(userData, {
                passedThreshold: false
              }));

              userData.ui.className = userData.ui.className.replace(/correct|incorrect/g, '');

              delete self.answered[answerId];
              self.game.answerStatus(undefined);

              

            }


            var style = 'rotate(' + (body.GetAngle() * 180 / Math.PI) + 'deg) translateZ(0)';
            shape.style.WebkitTransform = style;
            shape.style.MozTransform = style;
            shape.style.OTransform = style;
            shape.style.msTransform = style;
            shape.style.transform = style;
          }
        }
        body = body.GetNext();
      }

      // remove bodies
      for (var i = 0, len = this.bodiesToRemove.length; i < len; i++) {
        var toRemove = this.bodiesToRemove[i];
        this.world.DestroyBody(toRemove);
      }
      this.bodiesToRemove.length = 0;
    };

    Physics.prototype.showAnswers = function () {
      var platforms = this.scoringPlatform(),
          left      = platforms.left.GetUserData().data,
          middle    = platforms.middle && platforms.middle.GetUserData().data,
          right     = platforms.right.GetUserData().data,
          buckets   = {};
      buckets[left.id] = platforms.left;
      buckets[right.id] = platforms.right;
      middle && (buckets[middle.id] = platforms.middle);

      //Recorded BEFORE repositioning bodies because we need to know where they were exactly for feedback to work properly
      this.game.recordCurrentAnswers();

      var position = {};
      this.balls.forEach(function (body, i) {
        var userData       = body.GetUserData();
        if (!userData.isScorable) { return; } //nondraggable text

        var answer = userData.answer,
            bucket = buckets[answer.bucket];

        if (!bucket) { //content editor didn't set a bucket, so this game can't even be finished...
          if (userData.box2dX !== undefined) {
            body.SetPosition(new b2Vec2(userData.box2dX, userData.box2dY));
            body.SetAngle(0);
          }
          return;
        }

        var bucketPosition = bucket.GetPosition();

        position[answer.bucket] = position[answer.bucket] + 1 || 1;
        //bucket is the platform body
        //move every answer back to the top and
        body.SetPosition(new b2Vec2(bucketPosition.x, bucketPosition.y - ((30 * (position[answer.bucket])) / 30)));
        body.SetAngle(0);

        if (!userData.clone) {
          this._createClone(userData.ui);
        }

        userData.ui.className = userData.ui.className.replace(/selected|correct|incorrect/g, '') + ' selected correct draggable';

        userData.showAnswers = true;
      }, this);
    };

    Physics.prototype.rewind = function () {
      if (!this.answered) { return; }

      var answeredKeys = Object.keys(this.answered);
      //Recorded BEFORE repositioning bodies because we need to know where they were exactly for feedback to work properly
      //this._recordFeedback(answeredKeys);
      this.game.recordCurrentAnswers();

      answeredKeys.forEach(function (key) {
        var answered = this.answered[key];
        if (answered.correct) { return; }

        this._resetBody(answered.body);
      }, this);
    };

    Physics.prototype._resetBody = function (body) {
      var data = body.GetUserData();
      data.dockable = false;
      body.SetPosition(new b2Vec2(data.box2dX, data.box2dY));
      body.SetAngle(body.GetAngle());
      //body.SetPositionAndAngle(new b2Vec2(data.box2dX, data.box2dY), body.GetAngle());
      //body.SetPositionAndAngle(new b2Vec2(data.box2dX, data.box2dY), body.GetAngle());
      body.SetAngle(0);
      //body.SetType(b2Body.b2_staticBody);
      body.SetType(box2d.b2BodyType.b2_staticBody);
      body.GetFixtureList().SetSensor(true);

      this.view.playSound('snapTo');

      data.ui.className = data.ui.className.replace(/selected|correct|incorrect/g, '') + ' draggable';
      if (data.clone) { //!JP needs to move to view
        this._removeClone(data.clone);
        delete data.clone;
      }

      this.checkAnswers({   //answer check upon dragging wrong answer back into bank
                showPopup: false
      }); 

    };

    Physics.prototype.objectState = function (lastFeedback) {
      var state = [];
      angular.forEach(this.balls, function (ball) {
        var position       = ball.GetWorldCenter(),
            content        = ball.GetUserData(),
            isLastFeedback = false;

        if (lastFeedback) {
          isLastFeedback = content && content.answer && content.answer.id === lastFeedback.id;
        }

        state.push({
          x: position.x * pxPerMeter,
          y: position.y * pxPerMeter,
          angle: ball.GetAngle(),
          content: content.answer ? content.answer.content : content.content, //some pieces of text don't have an answer, so just get their content
          id: content.answer && content.answer.id,
          className: content.ui.className,
          isLastFeedback: isLastFeedback,
          lastFeedback: isLastFeedback ? lastFeedback : undefined
        });
      });
      return state;
    };

    Physics.prototype.checkContact = function () {
      var onScoringPlatform = {
        left: [],
        right: []
      };
      for (var i = 0; i < this.balls.length; i++) {
        var contact = this.balls[i].GetContactList();
        while (contact) {
          var current   = contact.contact,
            userDataA = current.GetFixtureA().GetBody().GetUserData(),
            userDataB = current.GetFixtureB().GetBody().GetUserData();

          if (userDataA !== null && userDataA.isScoringPlatform ||
            userDataB !== null && userDataB.isScoringPlatform) {
            var answer = userDataA.isScoringPlatform ? userDataB : userDataA;


            var scoringPlatformBody = userDataA.isScoringPlatform ? current.GetFixtureA().GetBody() : current.GetFixtureB().GetBody();
            if (scoringPlatformBody.GetUserData().position === 'left') {
              onScoringPlatform.left.push(answer);
            } else {
              onScoringPlatform.right.push(answer);
            }
          }
          contact = contact.next;
        }
      }
      return onScoringPlatform;
    };

    Physics.prototype.setupContactListener = function() {
      //var contactListener = new Box2D.Dynamics.b2ContactListener,
      var contactListener = new box2d.b2ContactListener,
          self            = this;
      contactListener.BeginContact = function(contact, manifold) {
        var userDataA = contact.GetFixtureA().GetBody().GetUserData(),
            userDataB = contact.GetFixtureB().GetBody().GetUserData();

        if (userDataA !== null && userDataA.isScoringPlatform ||
          userDataB !== null && userDataB.isScoringPlatform) {
          var speedSquared = contact.GetFixtureA().GetBody().GetLinearVelocity().LengthSquared(); // Use squared to save on square root calc.
          if (speedSquared === 0) {
            speedSquared = contact.GetFixtureB().GetBody().GetLinearVelocity().LengthSquared();
          }

          if (speedSquared > 500) {
            self.view.playSound(juice.sounds.collision);
          }
        }
      };
      self.world.SetContactListener(contactListener);
    };

    Physics.prototype.reset = function () {
      var gravity = new b2Vec2(0, 50),
          self    = this;

      var body = self.world.GetBodyList();
      while (body) {
        var b = body;
        body = body.GetNext();
        self.world.DestroyBody(b);
      }

      //self.world = new b2World(gravity, /*allow sleep= */ true);  //!PM 09-01-2016
      this.bodiesToRemove = [];
      this.bodies = [];
      this.balls = [];

      this.removeInteractions();
    };


    Physics.prototype.showDebugDraw = function() {
      var canvas = document.getElementById('canvas-debug');
      if (!canvas || !canvas.getContext('2d')) { return; }

      shouldDrawDebug = true;

      //var debugDraw = new b2DebugDraw();
      //debugDraw.SetSprite(canvas.getContext('2d'));
      //debugDraw.SetDrawScale(pxPerMeter);
      //debugDraw.SetFillAlpha(0.3);
      //debugDraw.SetLineThickness(1.0);
      //debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
      //this.world.SetDebugDraw(debugDraw);
    };

    return Physics;
  }]);
})();
