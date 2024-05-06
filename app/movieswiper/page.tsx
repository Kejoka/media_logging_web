"use client"

import TinderCard from "react-tinder-card";
import { useState, useEffect } from 'react'
import { IconButton, useTheme } from "@mui/material";
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';

function MovieSwiper() {
  const [movieList, setMovieList] = useState<{}[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [swipedCount, setSwipedCount] = useState(0);
  const theme = useTheme();

  const onSwipe = (direction: string, title: string, index: number) => {
    console.log("You swiped " + title + " " + direction);
    try {
      const el = document.getElementById(title + index);
      if (el != null) {
        el.style.pointerEvents = "none";
      }
    } catch (error) {
      console.log(error);
    }
  }

  const onCardLeftScreen = (direction: string, title: string, index: number) => {
    setSwipedCount(swipedCount + 1);
    console.log(title + " left the screen in " + direction + " direction");
    try {
      const el = document.getElementById(title + index);
      if (el != null) {
        el.style.visibility = "hidden";
      }
    } catch (error) {
      console.log(error);
    }
    try {
      fetch("http://localhost:5500/randomMovie")
        .then((res) => res.json())
        .then((movie) => {
          setMovieList([...movieList, movie]);
        });
    } catch (error) {
      console.log(error);
    }
  }


  useEffect(() => {
    if (isLoading) {
      try {
        fetch("http://localhost:5500/initialCards")
          .then((res) => res.json())
          .then((movies) => {
            setMovieList(movies);
            setLoading(false);
          });
      } catch (error) {
        setLoading(false);
        console.log(error);
      }
    }
  }, [movieList]);

  if (!isLoading) return (
    <div className="mx-auto max-w-lg bg-zinc-400">
      <div className="grid" id="cardStack">
        {movieList.map((movie, index) => {
          return <div id={movie["title"] + index} style={{ zIndex: (999999 - index) }} key={movie["title"] + index} className={`col-start-1 col-end-1 row-start-1 row-end-1`}>
            <TinderCard onSwipe={(direction) => onSwipe(direction, movie["title"], index)} onCardLeftScreen={(direction) => onCardLeftScreen(direction, movie["title"], index)}>
              <div className="bg-white p-2 rounded-imageCard">
                <img src={"https://image.tmdb.org/t/p/w500/" + movie["poster_path"]} alt={movie["title"]} className="rounded-imageCard shadow-current shadow-md pointer-events-none" />
              </div>
            </TinderCard>
          </div>
        })}
      </div>
      <div style={{ zIndex: 999999 }} className=" sticky flex flex-row max-w-screen-lg h-fit justify-evenly -mt-9" >
        <IconButton color="primary" className="bg-zinc-800 hover:bg-zinc-700 size-14">
          <HeartBrokenIcon className="size-8" />
        </IconButton>
        <IconButton color="primary" className="bg-zinc-800 hover:bg-zinc-700 size-14">
          <ThumbDownIcon className="size-8" />
        </IconButton>
        <IconButton color="primary" className="bg-zinc-800 hover:bg-zinc-700 size-14">
          <ThumbsUpDownIcon className="size-8" />
        </IconButton>
        <IconButton color="primary" className="bg-zinc-800 hover:bg-zinc-700 size-14">
          <ThumbUpIcon className="size-8" />
        </IconButton>
        <IconButton color="primary" className="bg-zinc-800 hover:bg-zinc-700 size-14">
          <FavoriteIcon className="size-8" />
        </IconButton>
      </div>
    </div >
  );
  else return (
    <p className="flex flex-col text-center">Loading movies..</p>
  );
}

export default MovieSwiper;
