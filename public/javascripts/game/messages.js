/* global createjs, angular, juice */
(function () {
  'use strict';
  var juice = window.juice = window.juice || {};
  juice.messages = {
    pickAndStack: {
      switchToStack: 'Now stack each item in the correct order by dragging it up and down, then click Check it! to check your answer.',
      scoreboardDefault: 'You did not complete your answer.',
      scoreboardDefaultIncorrect: 'You answered incorrectly.'
    },
    puzzler: {
      choose: 'You have to choose an answer!',
      tooLong: 'Your answer is too long. Try removing some items.',
    },
    feedback: {
      header: 'You answered :number_correct of :number_rounds rounds correctly. :congrats'
    },
    congratulatoryWording: [
      'Cool!',
      'Fantastic!',
      'Way to go!',
      'You’ve got it!',
      'That’s right!',
      'Excellent!',
      'Correct!',
      'Terrific!',
      'Marvelous!',
      'Superb!',
      'Great!',
      'Wonderful!',
      'Brilliant!',
      'Outstanding!'
    ],
    incorrectWording: [
      'Oops, not yet.',
      'Oops, that is not quite right.'
    ]
  };
})();