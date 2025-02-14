import { useForm } from "react-hook-form";
import * as yup from "yup";
import {yupResolver} from '@hookform/resolvers/yup';
import {addDoc, collection} from 'firebase/firestore';
import {auth, db } from "../../firebase-config";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate } from "react-router-dom";

export const CreateForm = () =>  {
    const [user] = useAuthState(auth);
    const navigate = useNavigate();

    const schema  = yup.object().shape({
        title: yup.string().required("You must add a title."),
        description: yup.string().required("You must add a description."),

    });

    const { 
        register, 
        handleSubmit, 
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
    });

    const reviewsRef = collection(db, "reviews");

    const onCreatePost = async (data) => {
        await addDoc(reviewsRef, {
            title: data.title,
            description: data.description,
            username: user?.displayName,
            userId: user?.uid,
       }); 

       navigate("/");
    };

    return (
        <form onSubmit={handleSubmit(onCreatePost)}>
            <div className="createPostPage"> 
            <div className="cpContainer">
            <h3>Write a Review</h3>
            <div className="inputGp">
                <label> Title:</label>
                <input placeholder="Title..." {...register("title")}/>
                <p style={{color: "red"}}> {errors.title?.message} </p>
            </div>
            <div className="inputGp">
                <label> Post:</label>
                <textarea placeholder="Start typing your review here..." {...register("description")}/>
                <p style={{color: "red"}}> {errors.description?.message}</p>
            </div>
                <button> Submit </button>
            </div>
            </div>
        </form>
    );
};