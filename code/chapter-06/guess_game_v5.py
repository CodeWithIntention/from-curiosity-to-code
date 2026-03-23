import random

MIN_NUMBER = 1
MAX_NUMBER = 100

print("Welcome! Let's play the number guessing game.\nVersion 5\n")

secret_number = random.randint(MIN_NUMBER, MAX_NUMBER)
guess = None

# Game loop
while guess != secret_number:
    user_input = input(f"Guess a number from {MIN_NUMBER} to {MAX_NUMBER}? ")
    guess = int(user_input)

    if guess == secret_number:
        print("You guessed it!")
    elif guess < secret_number:
        print("Higher. Guess again.")
    else:
        print("Lower. Guess again.")

print("Goodbye.")
