# Game Zone

A collection of classic games built with Next.js, TypeScript, and Tailwind CSS featuring a neubrutalism design style.

## Current Games

### Tic Tac Toe
Classic X and O game with:
- Two-player mode
- VS Computer mode with 3 difficulty levels (Easy, Medium, Hard)
- Unbeatable AI using Minimax algorithm
- Undo functionality
- Score tracking
- Sound effects

### Flappy Bird
Tap to fly through pipes with:
- Wing flapping animation
- Parallax scrolling clouds
- Scrolling ground texture
- Difficulty progression (speed increases, gap shrinks)
- 3-2-1 countdown before start
- Pause functionality (P or ESC key)
- Medal system (Bronze, Silver, Gold, Platinum)
- Score popups (+1 animation)
- Screen shake on collision
- Bird trail particles
- High score persistence (localStorage)
- Sound effects

### Snake
Classic snake game with:
- Arrow keys or WASD controls
- **Mobile controls:** Choose between BUTTONS or SWIPE mode
- Large on-screen D-pad buttons (64x64px)
- Speed increases as snake grows (speed bar indicator)
- 3-2-1 countdown before start
- Pause functionality (P or ESC key)
- Snake length tracking
- High score persistence (localStorage)
- **Combo system:** Eat fast for score multipliers (up to x6)
- **Power-ups:**
  - Golden apple: +50 points
  - Speed boost: +30 points + visual effect
- Bonus food spawns randomly (disappears after 5 seconds)
- Particle effects when eating food
- Screen shake on death
- Snake eyes follow direction
- Snake body gradient with opacity fade
- Sound effects for eating, bonus, power-up, and death

## Planned Games

### Easy
- [x] Snake - Classic snake eating food, growing longer
- [ ] Pong - Two-paddle ball bouncing game
- [ ] Memory Match - Flip cards to find matching pairs
- [ ] Whack-a-Mole - Click moles as they pop up
- [ ] Simon Says - Remember and repeat color sequences
- [ ] Breakout - Paddle bouncing ball to break bricks

### Medium
- [ ] Tetris - Falling blocks puzzle
- [ ] 2048 - Slide tiles to combine numbers
- [ ] Minesweeper - Classic bomb-finding puzzle
- [ ] Dino Run - Chrome dinosaur endless runner
- [ ] Space Invaders - Shoot descending aliens
- [ ] Wordle Clone - 5-letter word guessing game

### Advanced
- [ ] Pac-Man - Maze navigation eating dots
- [ ] Asteroids - Space ship shooting rocks
- [ ] Connect Four - Drop discs to get 4 in a row
- [ ] Tower Defense - Place towers to stop enemies

## Tech Stack

- **Framework:** Next.js 16
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Design:** Neubrutalism (thick borders, hard shadows, bold colors)
- **Audio:** Web Audio API (no external files)
- **Storage:** localStorage for high scores

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Design System

### Colors
- Primary: Cyan, Lime, Yellow, Orange, Rose
- Background: Amber-200
- Borders: Black (4px)
- Shadows: Hard offset shadows `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`

### Typography
- Font: Arial Black
- Style: Bold, uppercase for headers

### Components
- Buttons with hover translate effect
- Cards with rotation and hard shadows
- Dotted pattern background

## Contributing

To add a new game:

1. Create component in `src/components/GameName.tsx`
2. Add game to `games` array in `src/app/page.tsx`
3. Add game type to `GameType` union
4. Add conditional render in `Home` component

## License

MIT
