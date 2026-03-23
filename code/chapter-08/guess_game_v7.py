import random

MIN_NUMBER = 1
MAX_NUMBER = 100

print("Welcome! Let's play the number guessing game.\nVersion 7\n")

# Replay loop
while True:
    secret_number = random.randint(MIN_NUMBER, MAX_NUMBER)
    guess = None
    tries = 0

    # Game loop
    while guess != secret_number:
        user_input = input(f"Guess a number from {MIN_NUMBER} to {MAX_NUMBER}? ")
        guess = int(user_input)
        tries += 1

        if guess == secret_number:
            if tries == 1:
                print("Wow! You guessed it on the first try!")
            else:
                print(f"You guessed it in {tries} tries!")
        elif guess < secret_number:
            print("Higher. Guess again.")
        else:
            print("Lower. Guess again.")

    # Ask the player if they want to play again
    if input("Do you want to play again (y/n)? ") != "y":
        break  # exit the replay loop

print("Goodbye.")
