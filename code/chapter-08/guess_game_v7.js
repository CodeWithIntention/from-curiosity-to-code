const MIN_NUMBER = 1;
const MAX_NUMBER = 100;

console.log("Welcome! Let's play the number guessing game.\nVersion 7\n");

// Replay loop
do {
    let secret_number = Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER;
    let guess = null;
    let tries = 0;
    
    // Game loop
    while (guess !== secret_number) {
        let user_input = await input(`Guess a number from ${MIN_NUMBER} to ${MAX_NUMBER}?`);
        guess = Number(user_input);

        // Count the number of tries
        tries += 1;
        
        if (guess === secret_number) {
            if (tries === 1) {
                console.log("Wow! You guessed it on the first try!");
            } else {
                console.log(`You guessed it in ${tries} tries!`);
            }
        } else if (guess < secret_number) {
            console.log("Higher. Guess again.");
        } else {
            console.log("Lower. Guess again.");
        }
    }
} while (await input("Do you want to play again (y/n)?") === "y");

console.log("Goodbye.");
