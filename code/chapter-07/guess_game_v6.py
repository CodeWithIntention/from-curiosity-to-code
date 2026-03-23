import random

MIN_NUMBER = 1
MAX_NUMBER = 100

print("Welcome! Let's play the number guessing game.\nVersion 6\n")

secret_number = random.randint(MIN_NUMBER, MAX_NUMBER)
guess = None
tries = 0  # Guess counter state variable

# Game loop
while guess != secret_number:
    user_input = input(f"Guess a number from {MIN_NUMBER} to {MAX_NUMBER}? ")
    guess = int(user_input)
    tries += 1

    if guess == secret_number:
        if tries == 1:
            print("Wow! You guessed it on the first try!")  # Step 4a
        else:
            print(f"You guessed it in {tries} tries!")  # Step 4b
    elif guess < secret_number:
        print("Higher. Guess again.")
    else:
        print("Lower. Guess again.")

print("Goodbye.")
