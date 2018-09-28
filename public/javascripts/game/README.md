Game Docs
===

API
---

Game Interface
  Accept and register with GameResolver
  
    GameResolver.register('my_game', GameContructor);
    
  Expose the following methods (see public/games/game_example/game.js for an example game interface implementation)
  
    #play(content, startingState)
    #checkAnswers() --> not required for 'immediate' feedback games
    #showAnswers()
    #recordCurrentAnswers()
    #roundFeedback()
    #cleanUp()
    #rewind()
    
    #recordFeedback(Object results)

GameResolver.register(name, constructor)

Every game should have an entry point that can be instantiated, and internally understands all its own dependencies

Game Editor API
---

Game Editor Interface

    #addRound()
    #copyRound(round)
    #deleteRound(round)
    #changing()
    
    properties
    #data          --> 'content' data from the current file being edited
    #round         --> current round being edited
    #currentRound  --> currently selected round from dropdown
    
    #gameName --> game name, used to resolve the game and create it
    #gameTitle --> game title
    #gameDescription --> game description
    #feedbackType --> 'immediate', or undefined
    #header --> used for the header bar

Feedback Interface
---

  An attempt is the entire game session, before hitting Play Again or quitting the game. Hitting play again will create another
  'attempt'. There is no limit to the number of attempts.
  A round is one of the gameplay interactions during an attempt. It consists of multiple 'tries' and the last 'try' represents
  your final result for the round. There is currently a maximum of 5 rounds per game.
  A try is the interaction during the round. If you answer correctly the first time through, you only have one 'try' recorded. If you do something
  like Rewind or Reset, it starts a new 'try'. There is no limit to the number of tries.
  
    {
      attempts: [{
        id: 'uuid',
        rounds: [{
          id: 'uuid',
          tries: [{
            id: 'uuid',
            objectState: {} --> represents state of the game during that 'try'
          }]
        }]
      }]
    }

Data Interface
---
    
    {
      //Puzzler specific
      question: '',
      equation: '',
      values: [],
      
      //Sorter specific
      question: '',
      equation: '', <-- is that even used?
      buckets: [],
      answers: [],
      
      
      //Pretty consistent
      id: '[uuid]',
      answer_sets: [] OR answers: [],
      general_correct: '',
      general_incorrect: '',
      feedback: []
    }

Gameplay Feedback
---

**General**

Fun feedback.
  
Balloons, confetti, fireworks for correct answers.
   
Incorrect answers should be fun too, but not annoying.   

Feedback style can differ from one game to another.


**Instant**

- Answering correctly
  - As long as student is making correct answers, nothing is shown at the bottom except for Reset button and Info button
  - After student makes the last correct choice and the game sees that the student has entered all expected answers correctly, 
    something exciting happens, correct answer feedback shows, button at bottom says "Next Round"

- Incorrect answer
  - If student makes an incorrect choice, sees incorrect feedback and "Rewind" and "Show Answers" buttons are shown. 
    Student has to pick one before moving on
    - If student clicks "Rewind" then the incorrect feedback and indicators clear, but correct answers stay.   
      Student can continue and try to get a correct answer. 
    - If student clicks "Show Answers", then the answers show in a way that does not hide the student's incorrect answer, 
      and the button at the bottom shows "Next Round."
        
- **Suggestions**
  - Correct Feedback can get bigger and bigger as they get more in a row correct!        
        
**Submit**

- Answers correctly
  - Fun and exciting correct feedback display!    Button at bottom says "Next Round"
- Answers incorrectly
  - Incorrect answer feedback display
    - Buttons at bottom say  "Rewind" or  "Show Answer"
      - If student clicks “Rewind” then the incorrect feedback and indicators clear, but correct answers stay.   Student can try again.
      - If student clicks Show Answers, then the answers show in a way that does not hide the student's incorrect answer, and the button at the bottom shows “Next Round.”
  
**Rewind Behavior**

Clears the incorrect feedback and indicators and allows them to continue

In a multi input game, they do not have to replay the correct answers.

- Instant feedback
  - Appears the first time they answer incorrectly.
- Submit
  - Appears when they do not have a 100% correct answer.
  
  
Feedback Data
---

**Attempts**

An "Attempt" is the set of rounds a student plays through (a "Play Session"). If the student chooses "Play Again" at the end, they are starting a new "Attempt"

**Tries**

A "Try" is the round a student is currently playing. If the student hits the reset or rewind buttons, they are starting a new "Try". 

**Round 'Correctness'**

- State 1
  - Student submits with no errors, or answers everything correctly in instant feedback. 
    Round is considered correct on first try.
- State 2
  - Student submits with an error, or for instant feedback, answers incorrectly. Rewinds and corrects. Or Resets and starts over.
    Round is considered correct with more than one try.
- State 3
  - Student submits with an error or for instant feedback, answers incorrectly. Chooses Show answers. 
    Round is considered incorrect. (not yet)

**Mini-game 'Correctness'**

- State 1
  - All Rounds are in State 1: Mini-game is correct on first try
- State 2
  - At least 1 round is in State 2 but no round is in State 3: Mini-game is correct on multiple tries
- State 3
  - At least 1 round is in State 3: Mini-game is incorrect (not yet)


- Game States
  - Play
  - Rewind
  - Reset
  - Show Answers
  - Next Round