import axios from 'axios';
import { Field, Formik, Form } from 'formik';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom'; // ✅ gộp chung import

const SignUp = () => {
  const navigate = useNavigate(); // ✅ khởi tạo hook navigate

  return (
    <div className="flex flex-col items-center h-screen">
      <div className="border border-gray-300 px-32 py-10 rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">Sign up</h1>
          <Formik
            className="w-full max-w-md"
            initialValues={{
              firstName: "",
              lastName: "",
              username: "",
              password: "",
              email: "",
              phoneNumber: "",
              dateOfBirth: ""
            }}
            onSubmit={async (values) => {
              try {
                const res = await axios.post(
                  `${import.meta.env.VITE_API_URL}/users`,
                  values
                );
                console.log("hello", res);

                toast.success("User created successfully");

                // ✅ chuyển sang login sau khi signup thành công
                navigate("/login");
              } catch (error) {
                toast.error(error.response?.data?.data || "Signup failed");
              }
            }}
          >
            {({ errors, touched }) => (
              <Form>
                <div className="grid grid-cols gap-2 items-center mt-2 w-64">
                  <Field
                    type="text"
                    autoComplete="off"
                    name="firstName"
                    placeholder="Firstname"
                    className="border border-black p-2 rounded-lg"
                  />
                  <Field
                    type="text"
                    autoComplete="off"
                    name="lastName"
                    placeholder="Lastname"
                    className="border border-black p-2 rounded-lg"
                  />
                  <Field
                    type="text"
                    autoComplete="off"
                    name="username"
                    placeholder="Username"
                    className="border border-black p-2 rounded-lg"
                  />
                  <Field
                    type="password"
                    name="password"
                    placeholder="Password"
                    className="border border-black p-2 rounded-lg"
                  />
                  <Field
                    type="email"
                    autoComplete="off"
                    name="email"
                    placeholder="Email"
                    className="border border-black p-2 rounded-lg"
                  />
                  <Field
                    type="tel"
                    name="phoneNumber"
                    placeholder="Phone Number"
                    className="border border-black p-2 rounded-lg"
                  />
                  <Field
                    type="date"
                    name="dateOfBirth"
                    className="border border-black p-2 rounded-lg"
                  />

                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-20 rounded mt-2 mb-0"
                    type="submit"
                  >
                    Sign up
                  </button>
                  <p className="text-sm text-gray-500 mb-1 text-center">
                    Have an account?{" "}
                    <Link to="/login" className="text-blue-500 hover:underline">
                      Login
                    </Link>
                  </p>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
