"use client"

import { IconButton } from "@mui/material";
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import React from "react";
import TinderCard from "react-tinder-card";

interface Movie {
    posterUrl: string,
    title: string,
    description: string
}

const MovieSwiperCard: React.FC<{ movie: Movie }> = ({ movie }) => {
    const onSwipe = (direction: string) => {
        console.log("You swiped: " + direction);
    }

    const onCardLeftScreen = (myIdentifier: string) => {
        console.log(myIdentifier + " left the screen");
    }

    return (
        <div className="mx-auto max-w-lg h-screen bg-zinc-400">
            <TinderCard onSwipe={onSwipe} onCardLeftScreen={() => onCardLeftScreen('fooBar')}>
                <div className="bg-white p-2 rounded-imageCard">
                    <img src={movie.posterUrl} alt={movie.title} className="object-scale-down rounded-imageCard shadow-current shadow-md pointer-events-none" />
                </div>
            </TinderCard>
            <div className="flex flex-row  max-w-screen-lg justify-evenly -mt-8 mb-2">
                <IconButton color="primary" className="bg-zinc-900 hover:bg-zinc-700 size-14">
                    <HeartBrokenIcon className="size-8" />
                </IconButton>
                <IconButton color="primary" className="bg-zinc-900 hover:bg-zinc-700 size-14">
                    <ThumbDownIcon className="size-8" />
                </IconButton>
                <IconButton color="primary" className="bg-zinc-900 hover:bg-zinc-700 size-14">
                    <ThumbsUpDownIcon className="size-8" />
                </IconButton>
                <IconButton color="primary" className="bg-zinc-900 hover:bg-zinc-700 size-14">
                    <ThumbUpIcon className="size-8" />
                </IconButton>
                <IconButton color="primary" className="bg-zinc-900 hover:bg-zinc-700 size-14">
                    <FavoriteIcon className="size-8" />
                </IconButton>
            </div>
            <div className="text-center">
                <p className=" text-4xl font-semibold mb-2">{movie.title}</p>
                <p className="text-base">{movie.description}</p>
            </div>
        </div>
    );
};

export default MovieSwiperCard;