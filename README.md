# From Curiosity to Code

Companion source code and learning resources for *From Curiosity to Code* by Chuong M. Mai.

This repository follows the progression of the book chapter by chapter.

## What is in this repo

- runnable source code from the book
- chapter-by-chapter versions of the guessing game
- optional challenge ideas for readers
- setup and troubleshooting notes
- starter material for a future GitHub Pages companion site

## Who this repo is for

This repo is for readers who want to:

- type in the code from the book
- compare their work to reference versions
- experiment with improvements
- continue learning beyond the final chapter

## Repository layout

```text
code/      Chapter source code
extras/    Optional challenges and follow-up material
docs/      GitHub Pages companion site content
```

## Getting started

For the Python Edition, you need Python 3 installed on your computer.

Run a chapter file like this:

```bash
python code/chapter-02/guess_game_v1.py
```

On some systems you may need:

```bash
python3 code/chapter-02/guess_game_v1.py
```

For the JavaScript Edition, use the [`Web-Hosted JavaScript IDE.`](https://codewithintention.github.io/from-curiosity-to-code/js-ide/)

## Chapter guide

- Chapter 1: Hello - [`Python`](code/chapter-01/hello.py) / [`JavaScript`](code/chapter-01/hello.ps) 
- Chapter 2: Guess Game v1 - [`Python`](code/chapter-02/guess_game_v1.py), [`JavaScript`](code/chapter-02/guess_game_v1.js)
- Chapter 3: Guess Game v2 - [`Python`](code/chapter-03/guess_game_v2.py), [`JavaScript`](code/chapter-03/guess_game_v2.js)
- Chapter 4: Guess Game v3 - [`Python`](code/chapter-04/guess_game_v3.py), [`JavaScript`](code/chapter-04/guess_game_v3.js) 
- Chapter 5: Guess Game v4 - [`Python`](code/chapter-05/guess_game_v4.py), [`JavaScript`](code/chapter-05/guess_game_v4.js)
- Chapter 6: Guess Game v5 - [`Python`](code/chapter-06/guess_game_v5.py), [`JavaScript`](code/chapter-06/guess_game_v5.js)
- Chapter 7: Guess Game v6 - [`Python`](code/chapter-07/guess_game_v6.py), [`JavaScript`](code/chapter-07/guess_game_v6.js)
- Chapter 8: Guess Game v7 - [`Python`](code/chapter-08/guess_game_v7.py), [`JavaScript`](code/chapter-08/guess_game_v7.js)
- Chapter 9: Guess Game v8 - [`Python`](code/chapter-09/guess_game_v8.py), [`JavaScript`](code/chapter-09/guess_game_v8.js)
- Chapter 10: AI Prompts - [`code/chapter-10/prompts.md`](code/chapter-10/prompts.md)

## GitHub Pages

This repository includes a companion GitHub Pages site in [`docs/`](https://codewithintention.github.io/from-curiosity-to-code/index.html).

## Try extending the game

Some ideas to explore:

- prevent duplicate guesses from counting twice
- keep track of the best score
- save the best score between runs
- let the player choose a custom number range
- add a yes/no helper function for replay
- count invalid inputs separately
- add difficulty levels

## About the book

This repository is designed to support the book, not replace it.
The book explains the thinking behind the code.
This repo gives you a place to run it, inspect it, and build on it.

## License

MIT License

Copyright (c) 2026 CodeWithIntention

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
