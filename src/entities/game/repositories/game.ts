import { prisma } from "@/shared/lib/db";
import { Field, GameEntity, GameIdleEntity, GameInProgressEntity, GameOverDrawEntity, GameOverEntity } from "../domain";
import { Game, GameStatus, Prisma, User } from "@prisma/client";
import { z } from 'zod'
import { removePassword } from "@/shared/lib/password";





async function gamesList(where?: Prisma.GameWhereInput): Promise<GameEntity[]> {
    const games = await prisma.game.findMany({
        where,
        include: {
            winner: true,
            players: true
        }
    })

    return games.map(
        dbGameToGameEntity
    )
}



async function createGame(game: GameIdleEntity): Promise<GameEntity> {

    const newGame = await prisma.game.create({
        data: {
            status: 'idle',
            id: game.id,
            field: Array(9).fill(null),
            players: {
                connect: {
                    id: game.creator.id
                }
            }
        },
        include: {
            players: true,
            winner: true
        }
    })

    return dbGameToGameEntity(newGame)
}


const fieldSchema = z.array(z.union([z.string(), z.null()]))



function dbGameToGameEntity(game: Game & {
    players: User[]
    winner?: User | null
}): GameEntity {
    const players = game.players.map(removePassword)
    switch (game.status) {

        case 'idle': {

            const [creator] = players
            if (!creator) {
                throw new Error('Creator should be in game idle')
            }

            return {
                id: game.id,
                creator: creator,
                status: game.status,
                field: fieldSchema.parse(game.field)

            } satisfies GameIdleEntity
        };
        case 'inProgress':
        case 'gameOverDraw': {
            return {
                id: game.id,
                players: players,
                status: game.status,
                field: fieldSchema.parse(game.field)


            }

        };
        case 'gameOver': {
            if (!game.winner) {
                throw new Error('Winner should be in game over')
            }

            return {
                id: game.id,
                players: players,
                status: game.status,
                winner: removePassword(game.winner),
                field: fieldSchema.parse(game.field)
            } satisfies GameOverEntity

        };


    }

}


export const gameRepository = {
    gamesList,
    createGame
}
