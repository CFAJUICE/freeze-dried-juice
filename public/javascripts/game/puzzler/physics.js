/* global angular, juice, Box2D */
/* jsHint ignore:constructor */
(function () {
  'use strict';  

  var puzzler = angular.module('puzzler');
  puzzler.factory('PuzzlerPhysics', ['Log', 'PhysicsInteraction', 'Util', 'GameOptions', function (Log, PhysicsInteraction, Util, GameOptions) {
    var b2Vec2          = box2d.b2Vec2,
        b2BodyDef       = box2d.b2BodyDef,
        b2Body          = box2d.b2Body,
        b2FixtureDef    = box2d.b2FixtureDef,
        b2World         = box2d.b2World,
        b2PolygonShape  = box2d.b2PolygonShape,
        b2CircleShape   = box2d.b2CircleShape,
        b2DebugDraw     = box2d.b2DebugDraw,
        b2MouseJointDef = box2d.b2MouseJointDef;
    //var b2Vec2          = Box2D.Common.Math.b2Vec2,
    //    b2BodyDef       = Box2D.Dynamics.b2BodyDef,
    //    b2Body          = Box2D.Dynamics.b2Body,
    //    b2FixtureDef    = Box2D.Dynamics.b2FixtureDef,
    //    b2World         = Box2D.Dynamics.b2World,
    //    b2PolygonShape  = Box2D.Collision.Shapes.b2PolygonShape,
    //    b2CircleShape   = Box2D.Collision.Shapes.b2CircleShape,
    //    b2DebugDraw     = Box2D.Dynamics.b2DebugDraw,
    //    b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;
    var pxPerMeter      = 30;   // 30 pixels = 1 meter. Box2D uses meters and we use pixels.
    var shouldDrawDebug = false;
    var heightInPx = 515,
        widthInPx  = 900 - (GameOptions.frameWrap ? 20 : 0);

    function Physics(game, view) {
      this.game = game;
      this.view = view;
      this.bodiesToRemove = [];
      this.bodies = [];
      this.world = new b2World(/*gravity= */new b2Vec2(0, 50), /*allow sleep= */ true);

      PhysicsInteraction.mixin(this);

      this.addInteractions();
    }
    Physics.prototype._trackBody = function (body) {
      this.bodies.push(body);
    };
    Physics.prototype.createWorld = function () {
      this.balls = [];
    };

    Physics.prototype.spawnBall = function (info) {
      var positionX = info.x,
          positionY = info.y,
          //radius    = info.radius,
          bodyDef   = new b2BodyDef,
          fixDef    = new b2FixtureDef;

      fixDef.density = 1.5;
      fixDef.friction = 0.2;
      fixDef.restitution = 0.3;

      //bodyDef.type = b2Body.b2_dynamicBody;
      bodyDef.type = box2d.b2BodyType.b2_dynamicBody;

      bodyDef.position.x = positionX / pxPerMeter;
      bodyDef.position.y = positionY / pxPerMeter;
      if (info.linearVelocity === undefined) {
        bodyDef.linearVelocity = new b2Vec2(Math.random() * 10, Math.random() * 25);
      }


      var ball = this.world.CreateBody(bodyDef);
      this.balls.push(ball);
      this._trackBody(ball); //for reset cleanup
      var viewInfo = this.view.addUiToBody(ball, info);

      fixDef.shape = new b2CircleShape(viewInfo.radius / pxPerMeter);
      ball.CreateFixture(fixDef);
    };
    Physics.prototype.scoringPlatform = function () {
      return this.scoringPlatformBody;
    };
    Physics.prototype.createScoringPlatform = function () {
      var physics = this,
          left    = createPlatformPiece(290, 270, 12, 60),
          middle  = createPlatformPiece(450, 290, 310, 20),
          right   = createPlatformPiece(610, 270, 12, 60); //right

      this.view.displayPlatform(left, middle, right);
      this.scoringPlatformBody = middle.body;

      function createPlatformPiece(x, y, width, height) {
        var bodyDef          = new b2BodyDef,
            fixDef           = new b2FixtureDef,
            widthFromCenter  = width / 2,
            heightFromCenter = height / 2;

        //bodyDef.type = b2Body.b2_staticBody;
        bodyDef.type = box2d.b2BodyType.b2_staticBody;
        bodyDef.position.x = x / pxPerMeter;
        bodyDef.position.y = y / pxPerMeter;
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(widthFromCenter / pxPerMeter, heightFromCenter / pxPerMeter);

        var body = physics.world.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        body.SetUserData({
          isScoringPlatform: true,
          fixtureWidth: widthFromCenter,
          fixtureHeight: heightFromCenter
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

      //floor
      createBoundary(-200, heightInPx + 10, 2000, 10);
      //left wall
      createBoundary((widthInPx + (GameOptions.frameWrap ? 22 : 10)), heightInPx, 10, 2000);
      //right wall
      createBoundary((GameOptions.frameWrap ? -2 : -10), heightInPx, 10, 2000);
      //ceiling
      createBoundary(0, -10, 2000, 10);

      function createBoundary(x, y, width, height) {
        var bodyDef = new b2BodyDef;
        var fixDef = new b2FixtureDef;

        //bodyDef.type = b2Body.b2_staticBody;
        bodyDef.type = box2d.b2BodyType.b2_staticBody;
        bodyDef.position.x = x / pxPerMeter;
        bodyDef.position.y = y / pxPerMeter;
        fixDef.shape = new b2PolygonShape();
        fixDef.shape.SetAsBox(width / pxPerMeter, height / pxPerMeter);

        var body = physics.world.CreateBody(bodyDef);
        body.CreateFixture(fixDef);
        body.SetUserData({isBoundary:true}); // distinguish this object from others.
        physics._trackBody(body); //for reset cleanup

        return body;
      }
    };
    Physics.prototype.createRound = function (gameData, startingState) {
      var self = this;
      Util.timeout(function () {
        self.createScoringPlatform();
      }, startingState ? 0 : 2000);

      this.createBoundaries();
      this.setupContactListener();

      if (startingState) {
        for (var i = 0; i < startingState.length; i++) {
          this.spawnBall({
            content: {
              content: startingState[i].content,
              id: startingState[i].id
            },
            x: startingState[i].x,
            y: startingState[i].y,
            type: 'circle',
            linearVelocity: 0
          });
        }
        var game = this.game;
        Util.timeout(function () {
          game.checkAnswers();
        }, 100);

        return;
      }

      for (var i = 0, multiplier = 0; i < gameData.length; i++, multiplier++) {
        if (multiplier * 100 >= 850) {
          multiplier = 0;
        }

        this.spawnBall({
          content: gameData[i],
          x: multiplier * 100,
          y: multiplier * 2,
          type: 'circle'
        });
      }
    };

    //window.maxForce = 300.0;
    window.maxForce = 1500.0;
    window.collideConnected = true;
    window.mouseJoint = null;
    Physics.prototype.update = function () {
      var self        = this;
      if (self.isMouseDown && (!self.mouseJoint)) {
        self.view.dismissPopups();
      }

      if (self.isMouseDown && (!self.mouseJoint)) {
        var body = this.getBodyAtMouse();
        if (body) {
          var md = new b2MouseJointDef();
          //md.bodyA = self.world.GetGroundBody();


          var bodyADef    = new b2BodyDef;
          bodyADef.type = box2d.b2BodyType.b2_staticBody;
          md.bodyA = self.world.CreateBody(bodyADef);




          md.bodyB = body;

          //md.target.Set(self.mouseX, self.mouseY);
          md.target.x = self.mouseX;
          md.target.y = self.mouseY;

          md.collideConnected = window.collideConnected;
          md.maxForce = window.maxForce * body.GetMass();
          self.mouseJoint = self.world.CreateJoint(md);
          body.SetAwake(true);

          body.GetUserData().clearStatus = true;
        }
      }

      if (self.mouseJoint) {
        if (self.isMouseDown) {
          self.mouseJoint.SetTarget(new b2Vec2(self.mouseX, self.mouseY));
        } else {
          self.world.DestroyJoint(self.mouseJoint);
          self.mouseJoint = null;
        }
      }

      this.world.Step(1 / 60, 10, 10);
      if (shouldDrawDebug) {
        this.world.DrawDebugData();
      }
      this.world.ClearForces();

      var body = this.world.GetBodyList(), shape, userData, text, position;
      while (body) {
        userData = body.GetUserData();
        shape = userData && userData.ui;
        text = userData && userData.content;

        if (userData && userData.clearStatus && shape) {
          this.view.resetShapeByContent(text, shape);
          userData.clearStatus = false;
        }


        position = body.GetWorldCenter();
        var x = position.x * pxPerMeter,
            y = position.y * pxPerMeter;

        if (shape) {
          if (userData && userData.type === 'rect') {
            shape.x = x - userData.fixtureWidth;
            shape.y = y - userData.fixtureHeight;
          } else {
            shape.rotation = Util.rad2Deg(body.GetAngle());
            shape.x = x;
            shape.y = y;
          }
        }
        if (text && !GameOptions.perfTest) {
          var width = $(text).width() / 2;
          var height = $(text).height() / 2;

          var left        = (position.x * pxPerMeter) - (width),
              currentLeft = Math.abs(parseFloat(text.style.left)),
              top         = (position.y * pxPerMeter) + (height * 3.0),
              currentTop  = Math.abs(parseFloat(text.style.top));
          if (Math.abs(left - currentLeft) >= 1) {
            text.style.left = left + 'px';
          }
          if (Math.abs(top - currentTop) >= 1) {
            if (text.innerHTML.indexOf('MathJax') !== -1 && text.getAttribute('answer-content').indexOf('/') !== -1) {
              text.style.top = ((position.y * pxPerMeter) + (height * 1.4)) + 'px';
            } else {
              text.style.top = top + 'px';
            }
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
      var status  = this.game._answerStatus(),
          lookup  = {},
          answers;

      if (status.answerSet) {
        answers = status.answerSet.answers;
      } else {
        answers = this.game.content.answer_sets[0] && this.game.content.answer_sets[0].answers;
      }

      answers.forEach(function (answer, i) {
        lookup[answer.id] = {answer: answer, position: i};
        lookup[answer.content] = {answer: answer, position: i}; //FIXME remove this or condition when all file answers are ID based
      });

      var bodiesInOrder = [];
      this.balls.forEach(function (body) {
        var userData   = body.GetUserData(),
            answerData = lookup[userData.content.getAttribute('answer-content')]; //FIXME remove this when all file answers are ID based

        if (!answerData) {
          answerData = lookup[userData.content.getAttribute('answer-id')];
        }
        if (answerData) {
          bodiesInOrder[answerData.position] = body;
        }
      });

      //Record object state BEFORE we reset the position of the items (so we get an accurate output when viewing mistakes later on)
      var onScoringPlatform = this.checkContact();
      this.game.recordCurrentAnswers();

      onScoringPlatform.forEach(function (onPlatform) { //dump anything currently there off the platform, if it's incorrect
        if (bodiesInOrder.indexOf(onPlatform.box2d) === -1) {
          onPlatform.box2d.SetPosition(new b2Vec2(1, 1));
          onPlatform.box2d.SetAngle(0);
        }
      });

      var scoringPlatform = this.scoringPlatform(),
          platform        = scoringPlatform.GetUserData(),
          position        = {x: platform.ui.x, y: platform.ui.y};
      var i = 0;
      //display them from the end of the platform backwards, so we need to reverse the order of the answers
      bodiesInOrder.reverse().forEach(function (body) {
        body.SetPosition(new b2Vec2(((position.x + platform.fixtureWidth) / pxPerMeter) - (i++), (position.y / pxPerMeter) - 3));
        body.SetAngle(0);
      });

      return bodiesInOrder;
    };

    Physics.prototype.rewind = function () {
      var incorrect = [],
          answer    = this.game._answerStatus();
      for (var i = 0; i < answer.answers.length; i++) {
        var item = answer.answers[i];
        if (!answer.answers[i].matchesAny) {
          incorrect.push(answer.answers[i]);
        }

        this.view.resetShapeByContent(item.box2d.GetUserData().content, item.box2d.GetUserData().ui);
      }

      this.game.recordCurrentAnswers();

      var offset = 0.0;
      incorrect.forEach(function (item) {
        var body = item.box2d;
        body.SetPosition(new b2Vec2(1.5 + offset, 2));
        body.SetAngle(0);
        offset += 0.2;
      });
    };

    Physics.prototype.objectState = function () {
      var state = [];
      angular.forEach(this.balls, function (ball) {
        var position = ball.GetWorldCenter(),
            content  = ball.GetUserData().content;
        state.push({
          x: position.x * pxPerMeter,
          y: position.y * pxPerMeter,
          content: content.getAttribute('answer-content'),
          id: content.getAttribute('answer-id')
        });
      });
      return state;
    };

    Physics.prototype.checkContact = function () {
      var onScoringPlatform = [];
      for (var i = 0; i < this.balls.length; i++) {
        var contact = this.balls[i].GetContactList();
        while (contact) {
          var current   = contact.contact,
            userDataA = current.GetFixtureA().GetBody().GetUserData(),
            userDataB = current.GetFixtureB().GetBody().GetUserData();

          if (userDataA !== null && userDataA.isScoringPlatform ||
            userDataB !== null && userDataB.isScoringPlatform) {
            //var answer = userDataA.isScoringPlatform ? userDataB : userDataA;
            var answer = userDataA.isScoringPlatform ? current.GetFixtureB().GetBody() : current.GetFixtureA().GetBody();
            //onScoringPlatform.push(answer);
            onScoringPlatform.push(angular.extend({
              box2d: answer
            }, answer.GetUserData()));
          }
          contact = contact.next;
        }
      }

      //remove repeats (touching more than one boundary)
      var platformReturn = [],
          noDuplicates   = [];
      onScoringPlatform.forEach(function (onPlatform) {
        if (noDuplicates.indexOf(onPlatform.box2d) !== -1) {
          return;
        }
        noDuplicates.push(onPlatform.box2d);
        platformReturn.push(onPlatform);
      });

      return platformReturn;
    };

    Physics.prototype.setupContactListener = function() {
      //var contactListener = new Box2D.Dynamics.b2ContactListener,
      var contactListener = new box2d.b2ContactListener,
      //var contactListener = new box2d.b2ContactListener,
          self            = this;
      contactListener.BeginContact = function(contact, manifold) {
        var userDataA = contact.GetFixtureA().GetBody().GetUserData(),
            userDataB = contact.GetFixtureB().GetBody().GetUserData();

        if (userDataA !== null && userDataA.isScoringPlatform ||
          userDataB !== null && userDataB.isScoringPlatform) {
          var speedSquared = contact.GetFixtureA().GetBody().GetLinearVelocity().LengthSquared(); // Use squared to save on square root calc.
          var body = contact.GetFixtureA().GetBody();
          if (speedSquared === 0) {
            speedSquared = contact.GetFixtureB().GetBody().GetLinearVelocity().LengthSquared();
            body = contact.GetFixtureB().GetBody();
          }

          if (speedSquared > 500) {
            self.view.playSound(juice.sounds.collision);
          }
        }
      };
      this.world.SetContactListener(contactListener);
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

      //self.world = new b2World(gravity, /*allow sleep= */ true);  //!PM 09-02-2016
      this.bodiesToRemove = [];
      this.bodies = [];
      this.balls = [];

      this.removeInteractions();
    };

    Physics.prototype.showDebugDraw = function() {
      shouldDrawDebug = true;

      var debugDraw = new b2DebugDraw();
      debugDraw.SetSprite(document.getElementById('canvas-debug').getContext('2d'));
      debugDraw.SetDrawScale(pxPerMeter);
      debugDraw.SetFillAlpha(0.3);
      debugDraw.SetLineThickness(1.0);
      debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
      this.world.SetDebugDraw(debugDraw);
    };

    return Physics;
  }]);
})();