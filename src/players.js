//import { Move, SquareGrid } from "./utility.js"

export class Player {
  /* Class that represents a player in the game.  They are interacted with by the
   * Game component through two callbacks:
   * nextMove() is called by Game whenever the game wishes to get a move from the
   * player, returning a callback ( this._nextMoveCallback ) the Player will call
   * whenever a move has been made.
   * onLocalmoveAttempt() is a callback generated by the GameBoard whenever a
   * move is attempted to be performed there.
   */
  constructor(name) {
    this._name = name;
    this.onLocalMoveAttempt = this.onLocalMoveAttempt;
    this._moveCompleteCallback = null;
    this._currentState = null;
    this.score = 0;
  }

  generateNextMove() {
    /*
    //  Keep empty if there is no move calculation
    throw new Error(this.constructor.name + 'does not implement generateNextMove functionality');*/
  }

  onLocalMoveAttempt() {
    /*
    //  Keep empty if not using local GameBoard actions to determine move
    throw new Error(this.constructor.name + 'does not implement onLocalMoveAttempt functionality');*/
  }

  nextMove(squareGrid, moveCompleteCallback) {
    this._moveCompleteCallback = moveCompleteCallback;
    this._currentState = squareGrid.copy();
    return this.onLocalMoveAttempt.bind(this);
  }

  performMove(move) {
    // We want to consume the _moveCompleteCallback so that it won't
    // work anymore, we'll need to be passed a new one
		if (this._moveCompleteCallback) {
      let moveCompleteCallback = this._moveCompleteCallback;
      this.moveCompleteCallback = null; 
			moveCompleteCallback(move);
    }
  }

  performRandomMove(moves) {
    this.performMove(moves[Math.floor(Math.random() * moves.length)]);
  }

  addScore(num) {
		// addScore returns a modified Player object
		const newPlayer = new this.constructor(this._name);
    newPlayer.score = this.score + num;
		return newPlayer;
  }
}

export class LocalHumanPlayer extends Player {
  constructor(name) {
    super(name);
  }

  onLocalMoveAttempt(move) {
    this.performMove(move);
  }

  generateNextMove() {
    // Empty, no calculations done
    return;
  }

}

export class RandomPlayer extends Player {
  constructor(name) {
    super(name);
  }

  onLocalMoveAttempt(move) {
    // ignore
    return;
  }

  generateNextMove() { 
		setTimeout(() => this.performRandomMove(this._currentState.allPossibleMoves()), 700);
  }
}
