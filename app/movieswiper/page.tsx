import MovieSwiperCard from "@/components/cards/MovieSwiperCard";

let m = {
  posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  title: "Interstellar",
  description: "Space Shit"
}

const MovieSwiper = () =>
(
  <MovieSwiperCard movie={m} />
)
export default MovieSwiper;
