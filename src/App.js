import React, {Component} from "react";
import {hot} from "react-hot-loader"
import "./App.css";
import { Move, SquareGrid } from "./utility.js";
import { LocalHumanPlayer, RandomPlayer } from "./players.js";

const mEvents = Object.freeze({
	DOWN:		Symbol("down"),
	UP:			Symbol("up"),
	ENTER:	Symbol("enter"),
	LEAVE:	Symbol("leave")
});

const MAX_BOARD_SIZE = 30;

const GameStateContext = React.createContext(new SquareGrid(2,2));

export const mouseTracker = {
	// We need to know of the current mouse state for some functionalities
	mouseButtonDown : false,
	onUp() { this.mouseButtonDown = false; 	},
	onDown() { this.mouseButtonDown = true;  },
	isMouseButtonDown() { return this.mouseButtonDown; }
};

class SelectionCircle extends Component {
	render() {return (
		<div className="selectedCoordCircle"
			onMouseDown={() => this.props.handleMouseEvent(mEvents.DOWN)}
			onMouseUp={() => this.props.handleMouseEvent(mEvents.UP)}
			onMouseEnter={() => this.props.handleMouseEvent(mEvents.ENTER)}
			onMouseLeave={() => this.props.handleMouseEvent(mEvents.LEAVE)}
		/>
	)}
}

class GameBoardSquare extends Component {
	static contextType = GameStateContext;
	render() {
		let className = "gameBoardSquare";
		if (this.props.column == (this.context.nColumns - 1)) className += " rightBorder";
		if (this.props.row == (this.context.nRows - 1)) className += " bottomBorder";

		let squareChildren = [
			<SelectionCircle key={3}
				handleMouseEvent={(event) => this.props.handleMouseEvent(
				event, this.props.row, this.props.column)}
			/>,
			<div key={0} className="dot" />
		];

		if (this.context.hasLineDown(this.props.row, this.props.column)) {
			squareChildren.push(<div key={4} className="vertLine" />);
		}

		if (this.context.hasLineToRight(this.props.row, this.props.column)) {
			squareChildren.push(<div key={5} className="horizLine" />);
		}

		if (this.props.potentialHorizMove) {
			squareChildren.push(<div key={6} className="greyedHorizLine" />);
		}

		if (this.props.potentialVertMove) {
			squareChildren.push(<div key={7} className="greyedVertLine" />);
		}

		if (this.props.takenBy) {
			squareChildren.push(<div key={8} className="boxLabel" align="center"> {this.props.takenBy} </div>);
		}

		return (
			<div className={className} >
				{squareChildren}
			</div>
		)
	}
}

class GameBoardRow extends Component {
	static contextType = GameStateContext;

	render() {
		let renderedSquares = [];
		for (let index = 0; index < this.context.nColumns; index++) {
			renderedSquares.push(
			<GameBoardSquare
				key={index}
				column={index}
				row={this.props.row}
				potentialVertMove={
					this.props.potentialMove !== null &&
					this.props.potentialMove.r == this.props.row &&
					this.props.potentialMove.c == index &&
					this.props.potentialMove.isVertical()
				}
				potentialHorizMove={
					this.props.potentialMove !== null &&
					this.props.potentialMove.r == this.props.row &&
					this.props.potentialMove.c == index &&
					this.props.potentialMove.isHorizontal()
				}
				handleMouseEvent={this.props.handleMouseEvent}
				takenBy={this.props.ownershipGridRow[index]}
			/>)
		}
	return (
		<div key={this.props.row} className="gameBoardRow" >
			{renderedSquares}
		</div>
	)}
}

class GameBoard extends Component {
	static contextType = GameStateContext;

	constructor(props) {
		super(props);
		this.state = {
			selectedCoord: null,
			potentialMove: null
		};
	}

	handleMouseEvent(event, row, column){
		if (this.state.selectedCoord == null) {
			switch(event) {
				case mEvents.DOWN:
					this.highlightDot(row, column);
					this.setState({selectedCoord : {"column": column, "row": row}});
					break;
				case mEvents.UP:
					break;
				case mEvents.ENTER:
					this.highlightDot(row, column);
					break;
				case mEvents.LEAVE:
					this.unHighlightDot(row, column);
					break;
			}
		} else {
			const selRow = this.state.selectedCoord.row;
			const selColumn = this.state.selectedCoord.column;

			const isAdjacent = ((Math.abs(selColumn - column) + Math.abs(selRow - row)) == 1);
			switch(event) {
				case mEvents.DOWN:
					this.unHighlightPossibleMove();
					this.setState({selectedCoord : {"column": column, "row": row}});
					break;
				case mEvents.UP:
					if (isAdjacent) {
						this.makeMove(row, column);
						this.unHighlightPossibleMove();
					}
					this.setState({selectedCoord : null});
					break;
				case mEvents.ENTER:
					if (!mouseTracker.isMouseButtonDown()) {
						// happens when mouse is released outside of a selection circle
						this.setState({selectedCoord : null});
						break;
					}
					this.highlightDot(row, column);
					if (isAdjacent) {
						this.highlightPossibleMove(row, column);
					}
					break;
				case mEvents.LEAVE:
					if (isAdjacent) {
						this.unHighlightPossibleMove();
					}
					if (selRow != row || selColumn != column) {
						this.unHighlightDot(row, column);
					}
				break;
			}
		}
	}

	render() {
		const boardSize = Math.min(this.context.nColumns, this.context.nRows);
		const renderedRows = this.context.squares.map((squareRow, index) => {
			return (<GameBoardRow
				key={index}
				row={index}
				potentialMove={this.state.potentialMove}
				handleMouseEvent={this.handleMouseEvent.bind(this)}
				ownershipGridRow={this.props.ownershipGrid[index]}
			/>)});
		return (
			<div className="gameBoard" style={{fontSize : determineScalingFactor(boardSize)}}>
				{renderedRows}
			</div>
	)}

	makeMove(row, column) {
		const moveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		const isHorizontal = isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column});
		const move = new Move(moveCoords.row, moveCoords.column, isHorizontal ? "h" : "v");
		if (this.context.isMovePossible(move)) {
			this.props.onGameMove(move);
		}
		return;
	}

	highlightPossibleMove(row, column) {
		const possibleMoveCoords = {
			"row": Math.min(row, this.state.selectedCoord.row),
			"column": Math.min(column, this.state.selectedCoord.column)
		};
		if (isHorizontalLine(this.state.selectedCoord, {"row": row, "column": column})) {
			this.setState({potentialMove:
				new Move(possibleMoveCoords.row, possibleMoveCoords.column, "h")});
		} else {
			this.setState({potentialMove:
				new Move(possibleMoveCoords.row, possibleMoveCoords.column, "v")});
		}
		return;
	}

	unHighlightPossibleMove() {
		this.setState({potentialMove: null});
		return;
	}

	highlightDot(row, column) {
		//TODO: Implement highlightDot & unHighlightDot
		return;
	}

	unHighlightDot(row, column) {
		//TODO: Implement highlightDot & unHighlightDot
		return;
	}
}

class Game extends Component {
	constructor(props) {
		super(props);
		this.state = {
			players: [],
			currentPlayer: 1,
			matchNumber: 0,
			squareGrid: new SquareGrid(2,2),
			ownershipGrid: createEmptyBoard(2,2),
			localMoveCallback: null
		};
	}

	componentDidMount() {
		this.setUpGame();
	}

	componentDidUpdate() {
		//TODO: Find a way to do this that updates all UI before ending game
		/*
		if ((this.state.score1 + this.state.score2) == ((this.state.squareGrid.nRows - 1) * (this.state.squareGrid.nColumns - 1))) {
			this.determineWinner();
		}
		
		*/
		return;
	}

	render() {
		if (this.state.players.length < 2) {
			return null;
		}
		const player1 = this.state.players[0];
		const player2 = this.state.players[1];
		return (
			<div>
				<h1>{player1._name}[{player1.score}] vs {player2._name}[{player2.score}]</h1>
				<h2>Current player is {this.state.players[this.state.currentPlayer]._name}</h2>
				<GameStateContext.Provider value={this.state.squareGrid}>
					<GameBoard
						key={this.state.matchNumber}
						onGameMove={this.onGameMove.bind(this)}
						currentPlayerInitials={this.currentPlayerInitials.bind(this)}
						ownershipGrid={this.state.ownershipGrid}
					/>
				</GameStateContext.Provider>
				<div style={{padding: "4em"}}>
				<button onClick={() => this.removeLastMove()}
					style={{width: "9em", height: "3em"}}> Undo Move </button>
				</div>
			</div>
		);
	}

	onGameMove(move) {
		if (this.state.localMoveCallback) {
			this.state.localMoveCallback(move);
		}
		// that's it... lol If my code is working I'll get back to it
		/*
		this.setState((state, props) => ({squareGrid: state.squareGrid.update(move)}));

		const boxesCompleted = this.state.squareGrid.boxesCompletedBy(move);
		for (let box of boxesCompleted) {
			this.updateMatrixState("ownershipGrid", this.currentPlayerInitials(), ...box);
		}

		if (boxesCompleted.length > 0) {
			const whichScore = this.state.firstPlayerGoes ? "score1" : "score2";
			this.setState((state, props) => (
				{[whichScore]: state[whichScore] + boxesCompleted.length}));
		} else {
			// player does not go again if they do not finish a box / are undoing a box
			this.setState((state, props) => ({firstPlayerGoes: !state.firstPlayerGoes}));
		}
		return;
		*/
	}

	nextTurn() {
		// TODO: currently, we're accesing the this.state.currentPlayer
		// variable then using it to mutate state later.  This can cause
		// bugs, all the code should instead be within a setState call 
		// [gross, but necessary I guess]
		const currPlayer = this.state.players[this.state.currentPlayer];
		const moveCompletedCallback = (move) => {
			if (!this.state.squareGrid.isMovePossible(move)) {
				new Error("nextTurn(), player " + currPlayer.name +
					"emitted invalid move " + move.toString());
			}
			this.setState((state) => ({squareGrid: state.squareGrid.update(move)}));
			const boxesCompleted = this.state.squareGrid.boxesCompletedBy(move);
			for (let box of boxesCompleted) {
				this.updateMatrixState("ownershipGrid", this.currentPlayerInitials(), ...box);
			}
			currPlayer.addScore(boxesCompleted.length);
			if (boxesCompleted.length == 0) {
				this.setState(
					(state) => ({currentPlayer: ((state.currentPlayer == 0)? 1 : 0)}),
					() => this.nextTurn()
				);
			} else {
				// I want to be certain that all of the state changes in this callback
				// have been committed before the next turn begins.
				this.setState(
					(state) => ({currentPlayer: state.currentPlayer}),
					() => this.nextTurn()
				);
			}
		};

		this.setState({localMoveCallback: currPlayer.nextMove(this.state.squareGrid, moveCompletedCallback)});
	
		console.log("callback currplayer: " + this.state.currentPlayer);}

	removeLastMove() {
		// You can only remove moves if you are a LocalHumanPlayer and it is your turn
		if (!(this.state.players[this.state.currentPlayer] instanceof LocalHumanPlayer)) {
			return;
		}

		const lastMove = this.state.squareGrid.returnLastMove();
		if (lastMove === null) return false;
		this.setState((state) => ({squareGrid: state.squareGrid.remove(lastMove)}));

		const boxesCompleted = this.state.squareGrid.boxesCompletedBy(lastMove);
		for (let box of boxesCompleted) {
			this.updateMatrixState("ownershipGrid", null, ...box);
		}

		if (boxesCompleted.length > 0) {
			// TODO: Should be a more elegant way of modifying score
			this.setState((state, props) => ({
				players: state.players.map((player, index) => {
					if (index == state.currentPlayer) {
						player.addScore(-1 * boxesCompleted.length)}
					return player;})}));
		} else {
			this.setState((state, props) => ({currentPlayer: (state.currentPlayer == 0)? 1 : 0}));
		}
		return true;
	}

	updateMatrixState(stateVar, newValue, row, column) {
		// Map through rows and columns to find desired element location to mutate
		this.setState((state, props) => ({[stateVar]:
			state[stateVar].map((matrixRow, r) => {
				return matrixRow.map((matrixElement, c) => {
					if(c == column && r == row) {
						return newValue;
					} else {
						return matrixElement;
					}
				});
			})
		}));
	}

	determineWinner() {
		// Assumes only two players for now
		if (this.state.players[0].score == this.state.players[1].score) {
			alert("The Match was a tie!!");
		} else if (this.state.players[0].score > this.state.players[1].score) {
			alert(this.state.players[0].name + " is the winner");
		} else {
			alert(this.state.players[1].name + " is the winner");
		}
		if (confirm("Would you like to play again?")) {
			this.setUpGame();
		}
	}

	setUpGame() {
		const playerName1 = prompt("Player 1, please enter your name");
		const playAI = confirm("Would you like to face an AI opponent?");
		let player1 = new LocalHumanPlayer(playerName1);
		let player2;
		if (playAI) {
			player2 = new RandomPlayer("CPU");
		} else {
			const playerName2 = prompt("Player 2, please enter your name");
			player2 = new LocalHumanPlayer(playerName2);
		}
		let boardSize;
		while(true) {
			boardSize = parseInt(prompt("What size board would you like?"), 10);
			if (Number.isNaN(boardSize) || boardSize < 2 || boardSize > MAX_BOARD_SIZE) {
				alert("Invalid board size selected.  Must be between 2 and " + MAX_BOARD_SIZE);
			} else {
				break;
			}
		}	
		// TODO: Currently "nextTurn" is happening at beginning so
		// player2 is actually going first.  Low priority issue
		this.setState({
			players: [player1, player2],
			currentPlayer: 0,
			squareGrid: new SquareGrid(boardSize, boardSize),
			ownershipGrid: createEmptyBoard(boardSize, boardSize),
		}, () => this.nextTurn());
	}

	currentPlayerInitials() {
		//TODO: handle multiple part names with up to three initials
		// e.g. Hillary Rodham Clinton -> HRC
		const name = this.state.players[this.state.currentPlayer]._name;
		//TODO: change this quick hacky fix to something more permanent
		if (name == "CPU") {
			return "CPU";
		} else {
			this.state.players[this.state.currentPlayer]._name.charAt(0);
		}
	}
}

class App extends Component {
	render(){
		return (
			<div className="App">
				<Game />
			</div>
		);
	}
}

function createEmptyBoard(rows, columns) {
	let board = [];
	for (let r = 0; r < rows; r++) {
		let row = [];
		for (let c = 0; c < columns; c++) row.push(null);
		board.push(row);
	}
	return board;
}

function isHorizontalLine(firstCoord, secondCoord){
	if ((firstCoord.row == secondCoord.row) && (firstCoord.column != secondCoord.column)){
		return true;
	} else {
		return false;
	}
}

function determineScalingFactor(boardSize) {
	const fractionOfScreenTaken = .8;
	const maxPxScaleFactor = 32;

	const numPxInViewport = (Math.min(
		document.documentElement.clientWidth, document.documentElement.clientHeight));
	const boardSizeInPx = 6 * (boardSize - 1) + 1;
	const pxScaleFactor = numPxInViewport * fractionOfScreenTaken / boardSizeInPx;
	return Math.min(pxScaleFactor, maxPxScaleFactor);
}

function isEmpty(object) {
	for (let key in object) {
		if (object.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

export default hot(module)(App);
