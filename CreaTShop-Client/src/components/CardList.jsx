import PropTypes from "prop-types";
import Card from "./Card";

const CardList = (props) => {
  const prd = props.products
  return (
    <>
     
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {prd.map((product, index) => (
        <Card key={index} product={product} />
      ))}
    </div>
    </>
  );
};

CardList.propTypes = {products: PropTypes.arrayOf(PropTypes.object).isRequired};

export default CardList;
